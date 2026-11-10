import { z } from 'zod';

export const discountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);

export const createPromotionSchema = z.object({
  campaignId: z.coerce.number().positive().optional().nullable(),
  code: z
    .string()
    .trim()
    .min(3, 'Promo code must be at least 3 characters')
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, 'Promo code must contain only uppercase letters, numbers, hyphens, or underscores'),
  discountType: discountTypeEnum.default('PERCENTAGE'),
  discountValue: z.coerce.number().positive('Discount value must be greater than zero'),
  minOrderSubtotalKes: z.coerce.number().min(0).default(0),
  maxDiscountCapKes: z.coerce.number().min(0).optional().nullable(),
  maxUsageCount: z.coerce.number().int().min(1, 'Max usage count must be at least 1').default(100),
  startDate: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export const validatePromoCodeSchema = z.object({
  code: z.string().trim().min(1, 'Promo code is required'),
  subtotalKes: z.coerce.number().min(0, 'Subtotal is required'),
  customerId: z.coerce.number().positive().optional().nullable(),
});

export const listPromotionsQuerySchema = z.object({
  discountType: z.string().trim().optional(),
  status: z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'EXHAUSTED']).default('ALL'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.enum(['CREATED_AT', 'CODE', 'DISCOUNT_VALUE', 'USAGE_COUNT', 'EXPIRES_AT']).default('CREATED_AT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type DiscountType = z.infer<typeof discountTypeEnum>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type ValidatePromoCodeInput = z.infer<typeof validatePromoCodeSchema>;
export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;