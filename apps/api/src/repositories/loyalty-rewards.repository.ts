import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  loyaltyRewardsCatalog,
  loyaltyTiers,
  menuItems,
  customerLoyaltyProfiles,
  loyaltyPointTransactions,
  loyaltyTransactionsLedger,
  customers,
} from '../config/schema';
import {
  CreateRewardItemInput,
  ListRewardsQuery,
  RedeemRewardInput,
  UpdateRewardItemInput,
} from '../validators/loyalty-rewards.validator';

export const getRewardsDashboardMetrics = async (tenantId: number) => {
  const [summary] = await db
    .select({
      totalRewards: sql<number>`count(*)`,
      activeRewards: sql<number>`count(case when ${loyaltyRewardsCatalog.isActive} = true then 1 end)`,
      avgPointsCost: sql<number>`coalesce(avg(${loyaltyRewardsCatalog.pointsCost}), 0)::numeric`,
    })
    .from(loyaltyRewardsCatalog)
    .where(eq(loyaltyRewardsCatalog.tenantId, tenantId));

  const [redemptionsSummary] = await db
    .select({
      totalRedemptionsLogged: sql<number>`count(*)`,
      totalPointsBurned: sql<number>`coalesce(sum(case when ${loyaltyPointTransactions.points} < 0 then abs(${loyaltyPointTransactions.points}) else 0 end), 0)::numeric`,
    })
    .from(loyaltyPointTransactions)
    .where(
      and(
        eq(loyaltyPointTransactions.tenantId, tenantId),
        eq(loyaltyPointTransactions.transactionType, 'REDEEM_REWARD')
      )
    );

  return {
    totalCatalogItems: Number(summary?.totalRewards || 0),
    activeRewards: Number(summary?.activeRewards || 0),
    avgPointsCost: Math.round(Number(summary?.avgPointsCost || 0)),
    totalRedemptionsCount: Number(redemptionsSummary?.totalRedemptionsLogged || 0),
    totalPointsBurned: Number(redemptionsSummary?.totalPointsBurned || 0),
  };
};

export const listCatalogRewards = async (tenantId: number, query: ListRewardsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(loyaltyRewardsCatalog.tenantId, tenantId),
    query.rewardType && query.rewardType !== 'ALL'
      ? eq(loyaltyRewardsCatalog.rewardType, query.rewardType)
      : undefined,
    query.isActive === 'TRUE'
      ? eq(loyaltyRewardsCatalog.isActive, true)
      : query.isActive === 'FALSE'
      ? eq(loyaltyRewardsCatalog.isActive, false)
      : undefined,
    query.minTierId ? eq(loyaltyRewardsCatalog.minTierId, query.minTierId) : undefined,
    query.search
      ? or(
          ilike(loyaltyRewardsCatalog.name, `%${query.search}%`),
          ilike(loyaltyRewardsCatalog.description, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, rewardRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(loyaltyRewardsCatalog)
      .where(and(...conditions)),
    db
      .select({
        id: loyaltyRewardsCatalog.id,
        name: loyaltyRewardsCatalog.name,
        description: loyaltyRewardsCatalog.description,
        pointsCost: loyaltyRewardsCatalog.pointsCost,
        rewardType: loyaltyRewardsCatalog.rewardType,
        rewardValue: loyaltyRewardsCatalog.rewardValue,
        maxDiscountCap: loyaltyRewardsCatalog.maxDiscountCap,
        menuItemId: loyaltyRewardsCatalog.menuItemId,
        menuItemName: menuItems.name,
        menuItemPrice: menuItems.price,
        minTierId: loyaltyRewardsCatalog.minTierId,
        minTierName: loyaltyTiers.name,
        maxRedemptionsPerMember: loyaltyRewardsCatalog.maxRedemptionsPerMember,
        totalInventoryQuota: loyaltyRewardsCatalog.totalInventoryQuota,
        startDate: loyaltyRewardsCatalog.startDate,
        endDate: loyaltyRewardsCatalog.endDate,
        isActive: loyaltyRewardsCatalog.isActive,
        createdAt: loyaltyRewardsCatalog.createdAt,
      })
      .from(loyaltyRewardsCatalog)
      .leftJoin(menuItems, eq(loyaltyRewardsCatalog.menuItemId, menuItems.id))
      .leftJoin(loyaltyTiers, eq(loyaltyRewardsCatalog.minTierId, loyaltyTiers.id))
      .where(and(...conditions))
      .orderBy(asc(loyaltyRewardsCatalog.pointsCost))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    rewards: rewardRows.map((r) => ({
      ...r,
      rewardValue: Number(r.rewardValue),
      maxDiscountCap: r.maxDiscountCap ? Number(r.maxDiscountCap) : null,
      menuItemPrice: r.menuItemPrice ? Number(r.menuItemPrice) : null,
      minTierName: r.minTierName || 'Open to All Members',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createRewardItem = async (tenantId: number, input: CreateRewardItemInput) => {
  const [created] = await db
    .insert(loyaltyRewardsCatalog)
    .values({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      pointsCost: input.pointsCost,
      rewardType: input.rewardType,
      rewardValue: String(input.rewardValue),
      maxDiscountCap: input.maxDiscountCap !== undefined && input.maxDiscountCap !== null ? String(input.maxDiscountCap) : null,
      menuItemId: input.menuItemId ?? null,
      minTierId: input.minTierId ?? null,
      maxRedemptionsPerMember: input.maxRedemptionsPerMember ?? null,
      totalInventoryQuota: input.totalInventoryQuota ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      isActive: input.isActive,
    })
    .returning();

  return created;
};

export const updateRewardItem = async (
  tenantId: number,
  rewardId: number,
  input: UpdateRewardItemInput
) => {
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.pointsCost !== undefined) updateData.pointsCost = input.pointsCost;
  if (input.rewardType !== undefined) updateData.rewardType = input.rewardType;
  if (input.rewardValue !== undefined) updateData.rewardValue = String(input.rewardValue);
  if (input.maxDiscountCap !== undefined) {
    updateData.maxDiscountCap = input.maxDiscountCap !== null ? String(input.maxDiscountCap) : null;
  }
  if (input.menuItemId !== undefined) updateData.menuItemId = input.menuItemId;
  if (input.minTierId !== undefined) updateData.minTierId = input.minTierId;
  if (input.maxRedemptionsPerMember !== undefined) updateData.maxRedemptionsPerMember = input.maxRedemptionsPerMember;
  if (input.totalInventoryQuota !== undefined) updateData.totalInventoryQuota = input.totalInventoryQuota;
  if (input.startDate !== undefined) updateData.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.endDate !== undefined) updateData.endDate = input.endDate ? new Date(input.endDate) : null;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(loyaltyRewardsCatalog)
    .set(updateData)
    .where(and(eq(loyaltyRewardsCatalog.id, rewardId), eq(loyaltyRewardsCatalog.tenantId, tenantId)))
    .returning();

  return updated || null;
};

export const executeRewardRedemption = async (
  tenantId: number,
  userId: number,
  input: RedeemRewardInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Fetch reward specification
    const [reward] = await tx
      .select()
      .from(loyaltyRewardsCatalog)
      .where(
        and(
          eq(loyaltyRewardsCatalog.id, input.rewardId),
          eq(loyaltyRewardsCatalog.tenantId, tenantId),
          eq(loyaltyRewardsCatalog.isActive, true)
        )
      )
      .limit(1);

    if (!reward) {
      throw new Error('Reward item is inactive or does not exist');
    }

    // 2. Fetch or initialize customer loyalty profile
    let [profile] = await tx
      .select()
      .from(customerLoyaltyProfiles)
      .where(
        and(
          eq(customerLoyaltyProfiles.customerId, input.customerId),
          eq(customerLoyaltyProfiles.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!profile) {
      const [customerRow] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)));

      const startingPoints = customerRow?.loyaltyPoints || 0;
      const [newProfile] = await tx
        .insert(customerLoyaltyProfiles)
        .values({
          tenantId,
          customerId: input.customerId,
          currentPoints: startingPoints,
          lifetimePointsEarned: startingPoints,
          lifetimePointsRedeemed: 0,
        })
        .returning();
      profile = newProfile;
    }

    const currentPoints = profile.currentPoints;
    if (currentPoints < reward.pointsCost) {
      throw new Error(
        `Insufficient points: Member has ${currentPoints.toLocaleString()} pts, but reward requires ${reward.pointsCost.toLocaleString()} pts.`
      );
    }

    // Tier clearance validation
    if (reward.minTierId && profile.tierId) {
      const [requiredTier] = await tx
        .select()
        .from(loyaltyTiers)
        .where(eq(loyaltyTiers.id, reward.minTierId));

      const [memberTier] = await tx
        .select()
        .from(loyaltyTiers)
        .where(eq(loyaltyTiers.id, profile.tierId));

      if (requiredTier && memberTier && memberTier.minPoints < requiredTier.minPoints) {
        throw new Error(`Reward requires ${requiredTier.name} clearance.`);
      }
    }

    const newBalance = currentPoints - reward.pointsCost;
    const newLifetimeRedeemed = profile.lifetimePointsRedeemed + reward.pointsCost;

    // 3. Update customer loyalty profile and customers table
    await tx
      .update(customerLoyaltyProfiles)
      .set({
        currentPoints: newBalance,
        lifetimePointsRedeemed: newLifetimeRedeemed,
        updatedAt: new Date(),
      })
      .where(eq(customerLoyaltyProfiles.id, profile.id));

    await tx
      .update(customers)
      .set({
        loyaltyPoints: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, input.customerId));

    const auditDesc = `[REDEMPTION] Claimed "${reward.name}" (-${reward.pointsCost} pts)${input.notes ? ` - ${input.notes}` : ''}`;

    // 4. Record point transaction
    const [ptTx] = await tx
      .insert(loyaltyPointTransactions)
      .values({
        tenantId,
        customerId: input.customerId,
        orderId: input.orderId || null,
        transactionType: 'REDEEM_REWARD',
        points: -reward.pointsCost,
        balanceAfter: newBalance,
        description: auditDesc,
        processedById: userId,
      })
      .returning();

    // 5. Append to general audit ledger
    await tx.insert(loyaltyTransactionsLedger).values({
      tenantId,
      customerId: input.customerId,
      orderId: input.orderId || null,
      rewardId: reward.id,
      entryType: 'REDEMPTION_VOUCHER',
      pointsDelta: -reward.pointsCost,
      monetaryValueKes: reward.rewardValue,
      balanceBefore: currentPoints,
      balanceAfter: newBalance,
      channel: 'POS_TERMINAL',
      auditReference: `RDM-${Date.now().toString().slice(-6)}`,
      notes: auditDesc,
      processedById: userId,
    });

    return {
      success: true,
      reward,
      pointsBurned: reward.pointsCost,
      newBalance,
      transactionId: ptTx.id,
    };
  });
};