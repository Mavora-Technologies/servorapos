"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRewardRedemption = exports.updateRewardItem = exports.createRewardItem = exports.listCatalogRewards = exports.getRewardsDashboardMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getRewardsDashboardMetrics = async (tenantId) => {
    const [summary] = await db_1.db
        .select({
        totalRewards: (0, drizzle_orm_1.sql) `count(*)`,
        activeRewards: (0, drizzle_orm_1.sql) `count(case when ${schema_1.loyaltyRewardsCatalog.isActive} = true then 1 end)`,
        avgPointsCost: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.loyaltyRewardsCatalog.pointsCost}), 0)::numeric`,
    })
        .from(schema_1.loyaltyRewardsCatalog)
        .where((0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.tenantId, tenantId));
    const [redemptionsSummary] = await db_1.db
        .select({
        totalRedemptionsLogged: (0, drizzle_orm_1.sql) `count(*)`,
        totalPointsBurned: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.loyaltyTransactionsLedger.pointsDelta} < 0 then abs(${schema_1.loyaltyTransactionsLedger.pointsDelta}) else 0 end), 0)::numeric`,
    })
        .from(schema_1.loyaltyTransactionsLedger)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.loyaltyTransactionsLedger.entryType, 'REDEMPTION_VOUCHER')));
    return {
        totalCatalogItems: Number(summary?.totalRewards || 0),
        activeRewards: Number(summary?.activeRewards || 0),
        avgPointsCost: Math.round(Number(summary?.avgPointsCost || 0)),
        totalRedemptionsCount: Number(redemptionsSummary?.totalRedemptionsLogged || 0),
        totalPointsBurned: Number(redemptionsSummary?.totalPointsBurned || 0),
    };
};
exports.getRewardsDashboardMetrics = getRewardsDashboardMetrics;
const listCatalogRewards = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.tenantId, tenantId),
        query.rewardType && query.rewardType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.rewardType, query.rewardType)
            : undefined,
        query.isActive === 'TRUE'
            ? (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.isActive, true)
            : query.isActive === 'FALSE'
                ? (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.isActive, false)
                : undefined,
        query.minTierId ? (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.minTierId, query.minTierId) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.loyaltyRewardsCatalog.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.loyaltyRewardsCatalog.description, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, rewardRows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.loyaltyRewardsCatalog)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.loyaltyRewardsCatalog.id,
            name: schema_1.loyaltyRewardsCatalog.name,
            description: schema_1.loyaltyRewardsCatalog.description,
            pointsCost: schema_1.loyaltyRewardsCatalog.pointsCost,
            rewardType: schema_1.loyaltyRewardsCatalog.rewardType,
            rewardValue: schema_1.loyaltyRewardsCatalog.rewardValue,
            maxDiscountCap: schema_1.loyaltyRewardsCatalog.maxDiscountCap,
            menuItemId: schema_1.loyaltyRewardsCatalog.menuItemId,
            menuItemName: schema_1.menuItems.name,
            menuItemPrice: schema_1.menuItems.price,
            minTierId: schema_1.loyaltyRewardsCatalog.minTierId,
            minTierName: schema_1.loyaltyTiers.name,
            maxRedemptionsPerMember: schema_1.loyaltyRewardsCatalog.maxRedemptionsPerMember,
            totalInventoryQuota: schema_1.loyaltyRewardsCatalog.totalInventoryQuota,
            startDate: schema_1.loyaltyRewardsCatalog.startDate,
            endDate: schema_1.loyaltyRewardsCatalog.endDate,
            isActive: schema_1.loyaltyRewardsCatalog.isActive,
            createdAt: schema_1.loyaltyRewardsCatalog.createdAt,
        })
            .from(schema_1.loyaltyRewardsCatalog)
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.menuItemId, schema_1.menuItems.id))
            .leftJoin(schema_1.loyaltyTiers, (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.minTierId, schema_1.loyaltyTiers.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.loyaltyRewardsCatalog.pointsCost))
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
exports.listCatalogRewards = listCatalogRewards;
const createRewardItem = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.loyaltyRewardsCatalog)
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
exports.createRewardItem = createRewardItem;
const updateRewardItem = async (tenantId, rewardId, input) => {
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.name !== undefined)
        updateData.name = input.name;
    if (input.description !== undefined)
        updateData.description = input.description;
    if (input.pointsCost !== undefined)
        updateData.pointsCost = input.pointsCost;
    if (input.rewardType !== undefined)
        updateData.rewardType = input.rewardType;
    if (input.rewardValue !== undefined)
        updateData.rewardValue = String(input.rewardValue);
    if (input.maxDiscountCap !== undefined) {
        updateData.maxDiscountCap = input.maxDiscountCap !== null ? String(input.maxDiscountCap) : null;
    }
    if (input.menuItemId !== undefined)
        updateData.menuItemId = input.menuItemId;
    if (input.minTierId !== undefined)
        updateData.minTierId = input.minTierId;
    if (input.maxRedemptionsPerMember !== undefined)
        updateData.maxRedemptionsPerMember = input.maxRedemptionsPerMember;
    if (input.totalInventoryQuota !== undefined)
        updateData.totalInventoryQuota = input.totalInventoryQuota;
    if (input.startDate !== undefined)
        updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.endDate !== undefined)
        updateData.endDate = input.endDate ? new Date(input.endDate) : null;
    if (input.isActive !== undefined)
        updateData.isActive = input.isActive;
    const [updated] = await db_1.db
        .update(schema_1.loyaltyRewardsCatalog)
        .set(updateData)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.id, rewardId), (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.tenantId, tenantId)))
        .returning();
    return updated || null;
};
exports.updateRewardItem = updateRewardItem;
const executeRewardRedemption = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Fetch reward specification
        const [reward] = await tx
            .select()
            .from(schema_1.loyaltyRewardsCatalog)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.id, input.rewardId), (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.loyaltyRewardsCatalog.isActive, true)))
            .limit(1);
        if (!reward) {
            throw new Error('Reward item is inactive or does not exist');
        }
        // 2. Fetch or initialize customer loyalty profile
        let [profile] = await tx
            .select()
            .from(schema_1.customerLoyaltyProfiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.customerId, input.customerId), (0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tenantId, tenantId)))
            .limit(1);
        if (!profile) {
            const [customerRow] = await tx
                .select()
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.id, input.customerId), (0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId)));
            const startingPoints = customerRow?.loyaltyPoints || 0;
            const [newProfile] = await tx
                .insert(schema_1.customerLoyaltyProfiles)
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
            throw new Error(`Insufficient points: Member has ${currentPoints.toLocaleString()} pts, but reward requires ${reward.pointsCost.toLocaleString()} pts.`);
        }
        // Tier clearance validation
        if (reward.minTierId && profile.tierId) {
            const [requiredTier] = await tx
                .select()
                .from(schema_1.loyaltyTiers)
                .where((0, drizzle_orm_1.eq)(schema_1.loyaltyTiers.id, reward.minTierId));
            const [memberTier] = await tx
                .select()
                .from(schema_1.loyaltyTiers)
                .where((0, drizzle_orm_1.eq)(schema_1.loyaltyTiers.id, profile.tierId));
            if (requiredTier && memberTier && memberTier.minPoints < requiredTier.minPoints) {
                throw new Error(`Reward requires ${requiredTier.name} clearance.`);
            }
        }
        const newBalance = currentPoints - reward.pointsCost;
        const newLifetimeRedeemed = profile.lifetimePointsRedeemed + reward.pointsCost;
        // 3. Update customer loyalty profile and customers table
        await tx
            .update(schema_1.customerLoyaltyProfiles)
            .set({
            currentPoints: newBalance,
            lifetimePointsRedeemed: newLifetimeRedeemed,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.id, profile.id));
        await tx
            .update(schema_1.customers)
            .set({
            loyaltyPoints: newBalance,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.customers.id, input.customerId));
        const auditDesc = `[REDEMPTION] Claimed "${reward.name}" (-${reward.pointsCost} pts)${input.notes ? ` - ${input.notes}` : ''}`;
        // 4. Append to unified immutable loyaltyTransactionsLedger
        const [ptTx] = await tx
            .insert(schema_1.loyaltyTransactionsLedger)
            .values({
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
        })
            .returning();
        return {
            success: true,
            reward,
            pointsBurned: reward.pointsCost,
            newBalance,
            transactionId: ptTx.id,
        };
    });
};
exports.executeRewardRedemption = executeRewardRedemption;
