"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePromoCodeRule = exports.updatePromotionRecord = exports.createPromotionRecord = exports.listTenantPromotions = exports.getPromotionsDashboardMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getPromotionsDashboardMetrics = async (tenantId) => {
    const [summary] = await db_1.db
        .select({
        totalPromotions: (0, drizzle_orm_1.sql) `count(*)`,
        activePromotions: (0, drizzle_orm_1.sql) `count(case when ${schema_1.promotionalDiscounts.isActive} = true and (${schema_1.promotionalDiscounts.expiresAt} is null or ${schema_1.promotionalDiscounts.expiresAt} > now()) and ${schema_1.promotionalDiscounts.currentUsageCount} < ${schema_1.promotionalDiscounts.maxUsageCount} then 1 end)`,
        totalRedemptions: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.promotionalDiscounts.currentUsageCount}), 0)::numeric`,
        totalCapAllowance: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.promotionalDiscounts.maxUsageCount}), 0)::numeric`,
    })
        .from(schema_1.promotionalDiscounts)
        .where((0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.tenantId, tenantId));
    const totalRedemptions = Number(summary?.totalRedemptions || 0);
    const totalCap = Number(summary?.totalCapAllowance || 0);
    const burnRatePercent = totalCap > 0 ? Math.round((totalRedemptions / totalCap) * 1000) / 10 : 0;
    return {
        totalPromotions: Number(summary?.totalPromotions || 0),
        activePromotions: Number(summary?.activePromotions || 0),
        totalRedemptions,
        totalCapAllowance: totalCap,
        burnRatePercent,
    };
};
exports.getPromotionsDashboardMetrics = getPromotionsDashboardMetrics;
const listTenantPromotions = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.tenantId, tenantId),
        query.discountType && query.discountType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.discountType, query.discountType)
            : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.promotionalDiscounts.code, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.marketingCampaigns.name, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    let orderClause = (0, drizzle_orm_1.desc)(schema_1.promotionalDiscounts.createdAt);
    if (query.sortBy === 'CODE') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.promotionalDiscounts.code) : (0, drizzle_orm_1.desc)(schema_1.promotionalDiscounts.code);
    }
    else if (query.sortBy === 'DISCOUNT_VALUE') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.promotionalDiscounts.discountValue) : (0, drizzle_orm_1.desc)(schema_1.promotionalDiscounts.discountValue);
    }
    else if (query.sortBy === 'USAGE_COUNT') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.promotionalDiscounts.currentUsageCount) : (0, drizzle_orm_1.desc)(schema_1.promotionalDiscounts.currentUsageCount);
    }
    else if (query.sortBy === 'EXPIRES_AT') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.promotionalDiscounts.expiresAt) : (0, drizzle_orm_1.desc)(schema_1.promotionalDiscounts.expiresAt);
    }
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.promotionalDiscounts)
            .leftJoin(schema_1.marketingCampaigns, (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.campaignId, schema_1.marketingCampaigns.id))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.promotionalDiscounts.id,
            campaignId: schema_1.promotionalDiscounts.campaignId,
            campaignName: schema_1.marketingCampaigns.name,
            code: schema_1.promotionalDiscounts.code,
            discountType: schema_1.promotionalDiscounts.discountType,
            discountValue: schema_1.promotionalDiscounts.discountValue,
            minOrderSubtotalKes: schema_1.promotionalDiscounts.minOrderSubtotalKes,
            maxDiscountCapKes: schema_1.promotionalDiscounts.maxDiscountCapKes,
            maxUsageCount: schema_1.promotionalDiscounts.maxUsageCount,
            currentUsageCount: schema_1.promotionalDiscounts.currentUsageCount,
            startDate: schema_1.promotionalDiscounts.startDate,
            expiresAt: schema_1.promotionalDiscounts.expiresAt,
            isActive: schema_1.promotionalDiscounts.isActive,
            createdAt: schema_1.promotionalDiscounts.createdAt,
        })
            .from(schema_1.promotionalDiscounts)
            .leftJoin(schema_1.marketingCampaigns, (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.campaignId, schema_1.marketingCampaigns.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    return {
        promotions: rows.map((r) => {
            const isExpired = r.expiresAt ? new Date(r.expiresAt) < new Date() : false;
            const isExhausted = r.currentUsageCount >= r.maxUsageCount;
            const computedStatus = !r.isActive ? 'INACTIVE' : isExpired ? 'EXPIRED' : isExhausted ? 'EXHAUSTED' : 'ACTIVE';
            return {
                ...r,
                discountValue: Number(r.discountValue),
                minOrderSubtotalKes: Number(r.minOrderSubtotalKes),
                maxDiscountCapKes: r.maxDiscountCapKes ? Number(r.maxDiscountCapKes) : null,
                computedStatus,
                campaignName: r.campaignName || 'Direct Backoffice Voucher',
            };
        }),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listTenantPromotions = listTenantPromotions;
const createPromotionRecord = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.promotionalDiscounts)
        .values({
        tenantId,
        campaignId: input.campaignId || null,
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        discountValue: String(input.discountValue),
        minOrderSubtotalKes: String(input.minOrderSubtotalKes || 0),
        maxDiscountCapKes: input.maxDiscountCapKes ? String(input.maxDiscountCapKes) : null,
        maxUsageCount: input.maxUsageCount,
        currentUsageCount: 0,
        startDate: input.startDate ? new Date(input.startDate) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: input.isActive,
    })
        .returning();
    return created;
};
exports.createPromotionRecord = createPromotionRecord;
const updatePromotionRecord = async (tenantId, promoId, input) => {
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.code !== undefined)
        updateData.code = input.code.toUpperCase();
    if (input.discountType !== undefined)
        updateData.discountType = input.discountType;
    if (input.discountValue !== undefined)
        updateData.discountValue = String(input.discountValue);
    if (input.minOrderSubtotalKes !== undefined)
        updateData.minOrderSubtotalKes = String(input.minOrderSubtotalKes);
    if (input.maxDiscountCapKes !== undefined) {
        updateData.maxDiscountCapKes = input.maxDiscountCapKes !== null ? String(input.maxDiscountCapKes) : null;
    }
    if (input.maxUsageCount !== undefined)
        updateData.maxUsageCount = input.maxUsageCount;
    if (input.startDate !== undefined)
        updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.expiresAt !== undefined)
        updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (input.isActive !== undefined)
        updateData.isActive = input.isActive;
    const [updated] = await db_1.db
        .update(schema_1.promotionalDiscounts)
        .set(updateData)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.id, promoId), (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.tenantId, tenantId)))
        .returning();
    return updated || null;
};
exports.updatePromotionRecord = updatePromotionRecord;
const validatePromoCodeRule = async (tenantId, input) => {
    const [promo] = await db_1.db
        .select()
        .from(schema_1.promotionalDiscounts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.code, input.code.toUpperCase())))
        .limit(1);
    if (!promo) {
        return { valid: false, message: 'Invalid promo code' };
    }
    if (!promo.isActive) {
        return { valid: false, message: 'This promo code is currently disabled' };
    }
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) {
        return { valid: false, message: 'This promotional offer is not yet active' };
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < now) {
        return { valid: false, message: 'This promotional code has expired' };
    }
    if (promo.currentUsageCount >= promo.maxUsageCount) {
        return { valid: false, message: 'This voucher has reached its redemption limit' };
    }
    const minSpend = Number(promo.minOrderSubtotalKes || 0);
    if (input.subtotalKes < minSpend) {
        return {
            valid: false,
            message: `Minimum order subtotal of KES ${minSpend.toLocaleString()} required (Current: KES ${input.subtotalKes.toLocaleString()})`,
        };
    }
    const discountVal = Number(promo.discountValue);
    let computedDeduction = 0;
    if (promo.discountType === 'PERCENTAGE') {
        computedDeduction = (input.subtotalKes * discountVal) / 100;
        if (promo.maxDiscountCapKes) {
            computedDeduction = Math.min(computedDeduction, Number(promo.maxDiscountCapKes));
        }
    }
    else {
        computedDeduction = Math.min(input.subtotalKes, discountVal);
    }
    return {
        valid: true,
        promo: {
            id: promo.id,
            code: promo.code,
            discountType: promo.discountType,
            discountValue: discountVal,
            computedDeduction: Math.round(computedDeduction * 100) / 100,
        },
        message: 'Promotion applied successfully',
    };
};
exports.validatePromoCodeRule = validatePromoCodeRule;
