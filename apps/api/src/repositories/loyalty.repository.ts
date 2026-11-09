import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  loyaltyTiers,
  customerLoyaltyProfiles,
  loyaltyPointTransactions,
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
      totalEnrolledMembers: sql<number>`count(*)`,
      totalPointsCirculation: sql<number>`coalesce(sum(${customerLoyaltyProfiles.currentPoints}), 0)::numeric`,
      totalLifetimeEarned: sql<number>`coalesce(sum(${customerLoyaltyProfiles.lifetimePointsEarned}), 0)::numeric`,
      totalLifetimeRedeemed: sql<number>`coalesce(sum(${customerLoyaltyProfiles.lifetimePointsRedeemed}), 0)::numeric`,
    })
    .from(customerLoyaltyProfiles)
    .where(eq(customerLoyaltyProfiles.tenantId, tenantId));

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
    eq(customerLoyaltyProfiles.tenantId, tenantId),
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
      .from(customerLoyaltyProfiles)
      .innerJoin(customers, eq(customerLoyaltyProfiles.customerId, customers.id))
      .where(and(...conditions)),
    db
      .select({
        profileId: customerLoyaltyProfiles.id,
        currentPoints: customerLoyaltyProfiles.currentPoints,
        lifetimePointsEarned: customerLoyaltyProfiles.lifetimePointsEarned,
        lifetimePointsRedeemed: customerLoyaltyProfiles.lifetimePointsRedeemed,
        enrolledAt: customerLoyaltyProfiles.enrolledAt,
        customerId: customers.id,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerType: customers.customerType,
        tierName: loyaltyTiers.name,
        tierId: loyaltyTiers.id,
      })
      .from(customerLoyaltyProfiles)
      .innerJoin(customers, eq(customerLoyaltyProfiles.customerId, customers.id))
      .leftJoin(loyaltyTiers, eq(customerLoyaltyProfiles.tierId, loyaltyTiers.id))
      .where(and(...conditions))
      .orderBy(desc(customerLoyaltyProfiles.currentPoints))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    members: memberRecords,
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
    // 1. Find or create profile for customer
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
      const [newProf] = await tx
        .insert(customerLoyaltyProfiles)
        .values({
          tenantId,
          customerId: input.customerId,
          currentPoints: 0,
          lifetimePointsEarned: 0,
          lifetimePointsRedeemed: 0,
        })
        .returning();
      profile = newProf;
    }

    const newBalance = Math.max(0, profile.currentPoints + input.points);
    const newEarned = input.points > 0 ? profile.lifetimePointsEarned + input.points : profile.lifetimePointsEarned;
    const newRedeemed = input.points < 0 ? profile.lifetimePointsRedeemed + Math.abs(input.points) : profile.lifetimePointsRedeemed;

    // 2. Automatically evaluate tier assignment based on lifetime earned points
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

    // 3. Update Profile
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

    // 4. Insert Ledger Transaction
    const [txRecord] = await tx
      .insert(loyaltyPointTransactions)
      .values({
        tenantId,
        customerId: input.customerId,
        transactionType: input.transactionType,
        points: input.points,
        balanceAfter: newBalance,
        description: input.description,
        processedById: userId,
      })
      .returning();

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