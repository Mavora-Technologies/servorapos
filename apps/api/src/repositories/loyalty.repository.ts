import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  loyaltyTiers,
  customerLoyaltyProfiles,
  loyaltyPointTransactions,
  loyaltyTransactionsLedger,
  loyaltyRewardsCatalog,
  customers,
  users,
} from '../config/schema';
import {
  CreateLoyaltyTierInput,
  AdjustLoyaltyPointsInput,
  CreateRewardCatalogItemInput,
  ListLoyaltyQuery,
  UpdateLoyaltyTierInput,
} from '../validators/loyalty.validator';

export const getLoyaltyDashboardMetrics = async (tenantId: number) => {
  const [summary] = await db
    .select({
      totalEnrolledMembers: sql<number>`count(distinct ${customers.id})`,
      totalPointsCirculation: sql<number>`coalesce(sum(${customerLoyaltyProfiles.currentPoints}), 0)::numeric`,
      totalLifetimeEarned: sql<number>`coalesce(sum(${customerLoyaltyProfiles.lifetimePointsEarned}), 0)::numeric`,
      totalLifetimeRedeemed: sql<number>`coalesce(sum(${customerLoyaltyProfiles.lifetimePointsRedeemed}), 0)::numeric`,
    })
    .from(customers)
    .leftJoin(
      customerLoyaltyProfiles,
      and(
        eq(customers.id, customerLoyaltyProfiles.customerId),
        eq(customers.tenantId, customerLoyaltyProfiles.tenantId)
      )
    )
    .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));

  const tiers = await db
    .select({
      tierId: loyaltyTiers.id,
      name: loyaltyTiers.name,
      minPoints: loyaltyTiers.minPoints,
      earningMultiplier: loyaltyTiers.earningMultiplier,
      perks: loyaltyTiers.perks,
      memberCount: sql<number>`count(${customerLoyaltyProfiles.id})`,
    })
    .from(loyaltyTiers)
    .leftJoin(customerLoyaltyProfiles, eq(loyaltyTiers.id, customerLoyaltyProfiles.tierId))
    .where(eq(loyaltyTiers.tenantId, tenantId))
    .groupBy(loyaltyTiers.id)
    .orderBy(asc(loyaltyTiers.minPoints));

  const rewards = await db
    .select()
    .from(loyaltyRewardsCatalog)
    .where(and(eq(loyaltyRewardsCatalog.tenantId, tenantId), eq(loyaltyRewardsCatalog.isActive, true)))
    .orderBy(asc(loyaltyRewardsCatalog.pointsCost));

  return {
    summary: {
      totalEnrolledMembers: Number(summary?.totalEnrolledMembers || 0),
      totalPointsCirculation: Number(summary?.totalPointsCirculation || 0),
      totalLifetimeEarned: Number(summary?.totalLifetimeEarned || 0),
      totalLifetimeRedeemed: Number(summary?.totalLifetimeRedeemed || 0),
    },
    tiers: tiers.map((t) => ({
      ...t,
      earningMultiplier: Number(t.earningMultiplier),
      memberCount: Number(t.memberCount),
    })),
    rewards,
  };
};

export const listLoyaltyMembers = async (tenantId: number, query: ListLoyaltyQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(customers.tenantId, tenantId),
    eq(customers.isActive, true),
    query.tierId ? eq(customerLoyaltyProfiles.tierId, query.tierId) : undefined,
    query.search
      ? or(
          ilike(customers.name, `%${query.search}%`),
          ilike(customers.phone, `%${query.search}%`),
          ilike(customers.email, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, memberRecords] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .leftJoin(customerLoyaltyProfiles, eq(customers.id, customerLoyaltyProfiles.customerId))
      .where(and(...conditions)),
    db
      .select({
        profileId: customerLoyaltyProfiles.id,
        currentPoints: sql<number>`coalesce(${customerLoyaltyProfiles.currentPoints}, ${customers.loyaltyPoints}, 0)`,
        lifetimePointsEarned: sql<number>`coalesce(${customerLoyaltyProfiles.lifetimePointsEarned}, ${customers.loyaltyPoints}, 0)`,
        lifetimePointsRedeemed: sql<number>`coalesce(${customerLoyaltyProfiles.lifetimePointsRedeemed}, 0)`,
        enrolledAt: sql<string>`coalesce(${customerLoyaltyProfiles.enrolledAt}, ${customers.createdAt})`,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerType: customers.customerType,
        tierName: loyaltyTiers.name,
        tierId: loyaltyTiers.id,
      })
      .from(customers)
      .leftJoin(customerLoyaltyProfiles, eq(customers.id, customerLoyaltyProfiles.customerId))
      .leftJoin(loyaltyTiers, eq(customerLoyaltyProfiles.tierId, loyaltyTiers.id))
      .where(and(...conditions))
      .orderBy(desc(sql`coalesce(${customerLoyaltyProfiles.currentPoints}, ${customers.loyaltyPoints}, 0)`))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    members: memberRecords.map((m) => ({
      ...m,
      currentPoints: Number(m.currentPoints),
      lifetimePointsEarned: Number(m.lifetimePointsEarned),
      lifetimePointsRedeemed: Number(m.lifetimePointsRedeemed),
      tierName: m.tierName || 'Base Member',
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const adjustCustomerPoints = async (tenantId: number, userId: number, input: AdjustLoyaltyPointsInput) => {
  return await db.transaction(async (tx) => {
    // 1. Locate or create profile for customer
    let [profile] = await tx
      .select()
      .from(customerLoyaltyProfiles)
      .where(
        and(
          eq(customerLoyaltyProfiles.tenantId, tenantId),
          eq(customerLoyaltyProfiles.customerId, input.customerId)
        )
      )
      .limit(1);

    if (!profile) {
      const [customerRow] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, input.customerId), eq(customers.tenantId, tenantId)));

      const startingPoints = customerRow?.loyaltyPoints || 0;

      const [newProf] = await tx
        .insert(customerLoyaltyProfiles)
        .values({
          tenantId,
          customerId: input.customerId,
          currentPoints: startingPoints,
          lifetimePointsEarned: startingPoints,
          lifetimePointsRedeemed: 0,
        })
        .returning();
      profile = newProf;
    }

    const signedDelta = input.action === 'CREDIT' ? Math.abs(input.points) : -Math.abs(input.points);
    const balanceBefore = profile.currentPoints;
    const newBalance = Math.max(0, balanceBefore + signedDelta);
    const newEarned = signedDelta > 0 ? profile.lifetimePointsEarned + signedDelta : profile.lifetimePointsEarned;
    const newRedeemed = signedDelta < 0 ? profile.lifetimePointsRedeemed + Math.abs(signedDelta) : profile.lifetimePointsRedeemed;

    // 2. Automated Tier Advancement Check
    const availableTiers = await tx
      .select()
      .from(loyaltyTiers)
      .where(eq(loyaltyTiers.tenantId, tenantId))
      .orderBy(asc(loyaltyTiers.minPoints));

    let matchingTierId = profile.tierId;
    for (const t of availableTiers) {
      if (newEarned >= t.minPoints) {
        matchingTierId = t.id;
      }
    }

    // 3. Update customer_loyalty_profiles AND sync with customers.loyalty_points
    const [updatedProfile] = await tx
      .update(customerLoyaltyProfiles)
      .set({
        currentPoints: newBalance,
        lifetimePointsEarned: newEarned,
        lifetimePointsRedeemed: newRedeemed,
        tierId: matchingTierId,
        updatedAt: new Date(),
      })
      .where(eq(customerLoyaltyProfiles.id, profile.id))
      .returning();

    await tx
      .update(customers)
      .set({
        loyaltyPoints: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, input.customerId));

    const auditDescription = `[${input.reasonCode}] ${input.notes}${input.referenceNumber ? ` (Ref: ${input.referenceNumber})` : ''}`;

    // 4. Record in loyaltyPointTransactions
    const [txRecord] = await tx
      .insert(loyaltyPointTransactions)
      .values({
        tenantId,
        customerId: input.customerId,
        transactionType: 'MANUAL_ADJUSTMENT',
        points: signedDelta,
        balanceAfter: newBalance,
        description: auditDescription,
        processedById: userId,
      })
      .returning();

    // 5. Record in immutable loyaltyTransactionsLedger
    await tx
      .insert(loyaltyTransactionsLedger)
      .values({
        tenantId,
        customerId: input.customerId,
        entryType: 'MANUAL_ADJUSTMENT',
        pointsDelta: signedDelta,
        monetaryValueKes: '0.00',
        balanceBefore,
        balanceAfter: newBalance,
        channel: 'ADMIN_BACKOFFICE',
        auditReference: input.referenceNumber || `ADJ-${Date.now().toString().slice(-6)}`,
        notes: auditDescription,
        processedById: userId,
      });

    return { profile: updatedProfile, transaction: txRecord };
  });
};

export const createTierRecord = async (tenantId: number, input: CreateLoyaltyTierInput) => {
  const [tier] = await db
    .insert(loyaltyTiers)
    .values({
      tenantId,
      name: input.name,
      minPoints: input.minPoints,
      earningMultiplier: String(input.earningMultiplier),
      perks: input.perks,
      isActive: true,
    })
    .returning();
  return tier;
};

export const createRewardRecord = async (tenantId: number, input: CreateRewardCatalogItemInput) => {
  const [reward] = await db
    .insert(loyaltyRewardsCatalog)
    .values({
      tenantId,
      name: input.name,
      description: input.description || null,
      pointsCost: input.pointsCost,
      rewardType: input.rewardType,
      rewardValue: String(input.rewardValue),
      menuItemId: input.menuItemId || null,
      isActive: true,
    })
    .returning();
  return reward;
};