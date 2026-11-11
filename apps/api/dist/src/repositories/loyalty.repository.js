"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRewardRecord = exports.createTierRecord = exports.adjustCustomerPoints = exports.listLoyaltyMembers = exports.getLoyaltyDashboardMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getLoyaltyDashboardMetrics = async (tenantId) => {
    const [summary] = await db_1.db
        .select({
        totalEnrolledMembers: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.customers.id})`,
        totalPointsCirculation: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.customerLoyaltyProfiles.currentPoints}), 0)::numeric`,
        totalLifetimeEarned: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.customerLoyaltyProfiles.lifetimePointsEarned}), 0)::numeric`,
        totalLifetimeRedeemed: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.customerLoyaltyProfiles.lifetimePointsRedeemed}), 0)::numeric`,
    })
        .from(schema_1.customers)
        .leftJoin(schema_1.customerLoyaltyProfiles, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, schema_1.customerLoyaltyProfiles.customerId), (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, schema_1.customerLoyaltyProfiles.tenantId)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.customers.isActive, true)));
    const tiers = await db_1.db
        .select({
        tierId: schema_1.loyaltyTiers.id,
        name: schema_1.loyaltyTiers.name,
        minPoints: schema_1.loyaltyTiers.minPoints,
        earningMultiplier: schema_1.loyaltyTiers.earningMultiplier,
        perks: schema_1.loyaltyTiers.perks,
        memberCount: (0, drizzle_orm_1.sql) `count(${schema_1.customerLoyaltyProfiles.id})`,
    })
        .from(schema_1.loyaltyTiers)
        .leftJoin(schema_1.customerLoyaltyProfiles, (0, drizzle_orm_1.eq)(schema_1.loyaltyTiers.id, schema_1.customerLoyaltyProfiles.tierId))
        .where((0, drizzle_orm_1.eq)(schema_1.loyaltyTiers.tenantId, tenantId))
        .groupBy(schema_1.loyaltyTiers.id)
        .orderBy((0, drizzle_orm_1.asc)(schema_1.loyaltyTiers.minPoints));
    const rewards = await db_1.db
        .select()
        .from(schema_1.loyaltyRewardsCatalog)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.loyaltyRewardsCatalog.pointsCost));
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
exports.getLoyaltyDashboardMetrics = getLoyaltyDashboardMetrics;
const listLoyaltyMembers = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.customers.isActive, true),
        query.tierId ? (0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tierId, query.tierId) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.customers.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.phone, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.customers.email, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, memberRecords] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerLoyaltyProfiles, (0, drizzle_orm_1.eq)(schema_1.customers.id, schema_1.customerLoyaltyProfiles.customerId))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            profileId: schema_1.customerLoyaltyProfiles.id,
            currentPoints: (0, drizzle_orm_1.sql) `coalesce(${schema_1.customerLoyaltyProfiles.currentPoints}, ${schema_1.customers.loyaltyPoints}, 0)`,
            lifetimePointsEarned: (0, drizzle_orm_1.sql) `coalesce(${schema_1.customerLoyaltyProfiles.lifetimePointsEarned}, ${schema_1.customers.loyaltyPoints}, 0)`,
            lifetimePointsRedeemed: (0, drizzle_orm_1.sql) `coalesce(${schema_1.customerLoyaltyProfiles.lifetimePointsRedeemed}, 0)`,
            enrolledAt: (0, drizzle_orm_1.sql) `coalesce(${schema_1.customerLoyaltyProfiles.enrolledAt}, ${schema_1.customers.createdAt})`,
            customerId: schema_1.customers.id,
            customerName: schema_1.customers.name,
            customerPhone: schema_1.customers.phone,
            customerEmail: schema_1.customers.email,
            customerType: schema_1.customers.customerType,
            tierName: schema_1.loyaltyTiers.name,
            tierId: schema_1.loyaltyTiers.id,
        })
            .from(schema_1.customers)
            .leftJoin(schema_1.customerLoyaltyProfiles, (0, drizzle_orm_1.eq)(schema_1.customers.id, schema_1.customerLoyaltyProfiles.customerId))
            .leftJoin(schema_1.loyaltyTiers, (0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tierId, schema_1.loyaltyTiers.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `coalesce(${schema_1.customerLoyaltyProfiles.currentPoints}, ${schema_1.customers.loyaltyPoints}, 0)`))
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
exports.listLoyaltyMembers = listLoyaltyMembers;
const adjustCustomerPoints = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Locate or create profile for customer
        let [profile] = await tx
            .select()
            .from(schema_1.customerLoyaltyProfiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.customerId, input.customerId)))
            .limit(1);
        if (!profile) {
            const [customerRow] = await tx
                .select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, input.customerId), (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId)));
            const startingPoints = customerRow?.loyaltyPoints || 0;
            const [newProf] = await tx
                .insert(schema_1.customerLoyaltyProfiles)
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
            .from(schema_1.loyaltyTiers)
            .where((0, drizzle_orm_1.eq)(schema_1.loyaltyTiers.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.loyaltyTiers.minPoints));
        let matchingTierId = profile.tierId;
        for (const t of availableTiers) {
            if (newEarned >= t.minPoints) {
                matchingTierId = t.id;
            }
        }
        // 3. Update customer_loyalty_profiles AND sync with customers.loyalty_points
        const [updatedProfile] = await tx
            .update(schema_1.customerLoyaltyProfiles)
            .set({
            currentPoints: newBalance,
            lifetimePointsEarned: newEarned,
            lifetimePointsRedeemed: newRedeemed,
            tierId: matchingTierId,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.id, profile.id))
            .returning();
        await tx
            .update(schema_1.customers)
            .set({
            loyaltyPoints: newBalance,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.customers.id, input.customerId));
        const auditDescription = `[${input.reasonCode}] ${input.notes}${input.referenceNumber ? ` (Ref: ${input.referenceNumber})` : ''}`;
        // 4. Record in unified immutable loyaltyTransactionsLedger
        const [txRecord] = await tx
            .insert(schema_1.loyaltyTransactionsLedger)
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
        })
            .returning();
        return { profile: updatedProfile, transaction: txRecord };
    });
};
exports.adjustCustomerPoints = adjustCustomerPoints;
const createTierRecord = async (tenantId, input) => {
    const [tier] = await db_1.db
        .insert(schema_1.loyaltyTiers)
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
exports.createTierRecord = createTierRecord;
const createRewardRecord = async (tenantId, input) => {
    const [reward] = await db_1.db
        .insert(schema_1.loyaltyRewardsCatalog)
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
exports.createRewardRecord = createRewardRecord;
