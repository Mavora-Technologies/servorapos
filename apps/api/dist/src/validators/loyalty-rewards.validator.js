"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRewardsQuerySchema = exports.redeemRewardSchema = exports.updateRewardItemSchema = exports.createRewardItemSchema = exports.rewardTypeEnum = void 0;
const zod_1 = require("zod");
exports.rewardTypeEnum = zod_1.z.enum([
    'DISCOUNT_FIXED',
    'PERCENTAGE_OFF',
    'FREE_MENU_ITEM',
    'EXPERIENCE_PERK',
]);
exports.createRewardItemSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Reward name must be at least 2 characters').max(150),
    description: zod_1.z.string().trim().max(500).optional(),
    pointsCost: zod_1.z.coerce.number().int().positive('Point cost must be greater than zero'),
    rewardType: exports.rewardTypeEnum.default('DISCOUNT_FIXED'),
    rewardValue: zod_1.z.coerce.number().min(0, 'Reward value must be non-negative').default(0),
    maxDiscountCap: zod_1.z.coerce.number().min(0).optional().nullable(),
    menuItemId: zod_1.z.coerce.number().positive().optional().nullable(),
    minTierId: zod_1.z.coerce.number().positive().optional().nullable(),
    maxRedemptionsPerMember: zod_1.z.coerce.number().int().min(1).optional().nullable(),
    totalInventoryQuota: zod_1.z.coerce.number().int().min(0).optional().nullable(),
    startDate: zod_1.z.string().optional().nullable(),
    endDate: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateRewardItemSchema = exports.createRewardItemSchema.partial();
exports.redeemRewardSchema = zod_1.z.object({
    customerId: zod_1.z.coerce.number().positive('Customer ID is required'),
    rewardId: zod_1.z.coerce.number().positive('Reward ID is required'),
    orderId: zod_1.z.coerce.number().positive().optional().nullable(),
    notes: zod_1.z.string().trim().optional(),
});
exports.listRewardsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    rewardType: zod_1.z.string().trim().optional(),
    minTierId: zod_1.z.coerce.number().positive().optional(),
    isActive: zod_1.z.enum(['ALL', 'TRUE', 'FALSE']).default('TRUE'),
    search: zod_1.z.string().trim().optional(),
});
