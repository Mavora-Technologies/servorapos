import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import { promotionalDiscounts, marketingCampaigns } from '../config/schema';
import {
  CreatePromotionInput,
  ListPromotionsQuery,
  UpdatePromotionInput,
  ValidatePromoCodeInput,
} from '../validators/promotional-discount.validator';

export const getPromotionsDashboardMetrics = async (tenantId: number) => {
  const [summary] = await db
    .select({
      totalPromotions: sql<number>`count(*)`,
      activePromotions: sql<number>`count(case when ${promotionalDiscounts.isActive} = true and (${promotionalDiscounts.expiresAt} is null or ${promotionalDiscounts.expiresAt} > now()) and ${promotionalDiscounts.currentUsageCount} < ${promotionalDiscounts.maxUsageCount} then 1 end)`,
      totalRedemptions: sql<number>`coalesce(sum(${promotionalDiscounts.currentUsageCount}), 0)::numeric`,
      totalCapAllowance: sql<number>`coalesce(sum(${promotionalDiscounts.maxUsageCount}), 0)::numeric`,
    })
    .from(promotionalDiscounts)
    .where(eq(promotionalDiscounts.tenantId, tenantId));

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

export const listTenantPromotions = async (tenantId: number, query: ListPromotionsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(promotionalDiscounts.tenantId, tenantId),
    query.discountType && query.discountType !== 'ALL'
      ? eq(promotionalDiscounts.discountType, query.discountType)
      : undefined,
    query.search
      ? or(
          ilike(promotionalDiscounts.code, `%${query.search}%`),
          ilike(marketingCampaigns.name, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  let orderClause = desc(promotionalDiscounts.createdAt);
  if (query.sortBy === 'CODE') {
    orderClause = query.sortOrder === 'ASC' ? asc(promotionalDiscounts.code) : desc(promotionalDiscounts.code);
  } else if (query.sortBy === 'DISCOUNT_VALUE') {
    orderClause = query.sortOrder === 'ASC' ? asc(promotionalDiscounts.discountValue) : desc(promotionalDiscounts.discountValue);
  } else if (query.sortBy === 'USAGE_COUNT') {
    orderClause = query.sortOrder === 'ASC' ? asc(promotionalDiscounts.currentUsageCount) : desc(promotionalDiscounts.currentUsageCount);
  } else if (query.sortBy === 'EXPIRES_AT') {
    orderClause = query.sortOrder === 'ASC' ? asc(promotionalDiscounts.expiresAt) : desc(promotionalDiscounts.expiresAt);
  }

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(promotionalDiscounts)
      .leftJoin(marketingCampaigns, eq(promotionalDiscounts.campaignId, marketingCampaigns.id))
      .where(and(...conditions)),
    db
      .select({
        id: promotionalDiscounts.id,
        campaignId: promotionalDiscounts.campaignId,
        campaignName: marketingCampaigns.name,
        code: promotionalDiscounts.code,
        discountType: promotionalDiscounts.discountType,
        discountValue: promotionalDiscounts.discountValue,
        minOrderSubtotalKes: promotionalDiscounts.minOrderSubtotalKes,
        maxDiscountCapKes: promotionalDiscounts.maxDiscountCapKes,
        maxUsageCount: promotionalDiscounts.maxUsageCount,
        currentUsageCount: promotionalDiscounts.currentUsageCount,
        startDate: promotionalDiscounts.startDate,
        expiresAt: promotionalDiscounts.expiresAt,
        isActive: promotionalDiscounts.isActive,
        createdAt: promotionalDiscounts.createdAt,
      })
      .from(promotionalDiscounts)
      .leftJoin(marketingCampaigns, eq(promotionalDiscounts.campaignId, marketingCampaigns.id))
      .where(and(...conditions))
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

export const createPromotionRecord = async (tenantId: number, input: CreatePromotionInput) => {
  const [created] = await db
    .insert(promotionalDiscounts)
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

export const updatePromotionRecord = async (
  tenantId: number,
  promoId: number,
  input: UpdatePromotionInput
) => {
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.code !== undefined) updateData.code = input.code.toUpperCase();
  if (input.discountType !== undefined) updateData.discountType = input.discountType;
  if (input.discountValue !== undefined) updateData.discountValue = String(input.discountValue);
  if (input.minOrderSubtotalKes !== undefined) updateData.minOrderSubtotalKes = String(input.minOrderSubtotalKes);
  if (input.maxDiscountCapKes !== undefined) {
    updateData.maxDiscountCapKes = input.maxDiscountCapKes !== null ? String(input.maxDiscountCapKes) : null;
  }
  if (input.maxUsageCount !== undefined) updateData.maxUsageCount = input.maxUsageCount;
  if (input.startDate !== undefined) updateData.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.expiresAt !== undefined) updateData.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [updated] = await db
    .update(promotionalDiscounts)
    .set(updateData)
    .where(and(eq(promotionalDiscounts.id, promoId), eq(promotionalDiscounts.tenantId, tenantId)))
    .returning();

  return updated || null;
};

export const validatePromoCodeRule = async (tenantId: number, input: ValidatePromoCodeInput) => {
  const [promo] = await db
    .select()
    .from(promotionalDiscounts)
    .where(and(eq(promotionalDiscounts.tenantId, tenantId), eq(promotionalDiscounts.code, input.code.toUpperCase())))
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
  } else {
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