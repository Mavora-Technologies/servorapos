"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPromotionsQuerySchema = exports.validatePromoCodeSchema = exports.updatePromotionSchema = exports.createPromotionSchema = exports.discountTypeEnum = void 0;
const zod_1 = require("zod");
exports.discountTypeEnum = zod_1.z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
exports.createPromotionSchema = zod_1.z.object({
    campaignId: zod_1.z.coerce.number().positive().optional().nullable(),
    code: zod_1.z
        .string()
        .trim()
        .min(3, 'Promo code must be at least 3 characters')
        .max(50)
        .regex(/^[A-Z0-9_-]+$/, 'Promo code must contain only uppercase letters, numbers, hyphens, or underscores'),
    discountType: exports.discountTypeEnum.default('PERCENTAGE'),
    discountValue: zod_1.z.coerce.number().positive('Discount value must be greater than zero'),
    minOrderSubtotalKes: zod_1.z.coerce.number().min(0).default(0),
    maxDiscountCapKes: zod_1.z.coerce.number().min(0).optional().nullable(),
    maxUsageCount: zod_1.z.coerce.number().int().min(1, 'Max usage count must be at least 1').default(100),
    startDate: zod_1.z.string().optional().nullable(),
    expiresAt: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updatePromotionSchema = exports.createPromotionSchema.partial();
exports.validatePromoCodeSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(1, 'Promo code is required'),
    subtotalKes: zod_1.z.coerce.number().min(0, 'Subtotal is required'),
    customerId: zod_1.z.coerce.number().positive().optional().nullable(),
});
exports.listPromotionsQuerySchema = zod_1.z.object({
    discountType: zod_1.z.string().trim().optional(),
    status: zod_1.z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'EXHAUSTED']).default('ALL'),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    sortBy: zod_1.z.enum(['CREATED_AT', 'CODE', 'DISCOUNT_VALUE', 'USAGE_COUNT', 'EXPIRES_AT']).default('CREATED_AT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
});
