"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLoyaltyQuerySchema = exports.createRewardCatalogItemSchema = exports.updateLoyaltyTierSchema = exports.createLoyaltyTierSchema = exports.adjustLoyaltyPointsSchema = exports.loyaltyAdjustmentActionEnum = exports.loyaltyAdjustmentReasonEnum = void 0;
const zod_1 = require("zod");
exports.loyaltyAdjustmentReasonEnum = zod_1.z.enum([
    'SERVICE_RECOVERY', // Comps for kitchen delay, order mistake, etc.
    'VIP_COURTESY', // Management goodwill gesture
    'DISPUTE_RESOLUTION', // Resolution of a billing/point discrepancy
    'PROMOTIONAL_ENROLLMENT', // Welcome onboard credit
    'ANNIVERSARY_BONUS', // Birthday or membership milestone
    'MANUAL_RECONCILIATION', // System or bookkeeping adjustment
    'POINTS_EXPIRY_OVERRIDE', // Reinstating expired points
    'FRAUD_PREVENTION_REVOKE', // Revoking fraudulent or erroneous points
]);
exports.loyaltyAdjustmentActionEnum = zod_1.z.enum(['CREDIT', 'DEBIT']);
exports.adjustLoyaltyPointsSchema = zod_1.z.object({
    customerId: zod_1.z.coerce.number().positive('Valid customer ID is required'),
    action: exports.loyaltyAdjustmentActionEnum.default('CREDIT'),
    points: zod_1.z.coerce.number().int().positive('Point magnitude must be greater than zero'),
    reasonCode: exports.loyaltyAdjustmentReasonEnum,
    notes: zod_1.z.string().trim().min(3, 'Detailed justification note is required (min 3 characters)'),
    referenceNumber: zod_1.z.string().trim().optional(), // e.g. Support ticket # or Order #
});
exports.createLoyaltyTierSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Tier name is required'),
    minPoints: zod_1.z.coerce.number().int().min(0).default(0),
    earningMultiplier: zod_1.z.coerce.number().min(0.1).default(1.0),
    perks: zod_1.z.array(zod_1.z.string().trim()).default([]),
});
exports.updateLoyaltyTierSchema = exports.createLoyaltyTierSchema.partial();
exports.createRewardCatalogItemSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Reward name is required'),
    description: zod_1.z.string().trim().optional(),
    pointsCost: zod_1.z.coerce.number().int().positive('Points cost must be greater than zero'),
    rewardType: zod_1.z.enum(['DISCOUNT_FIXED', 'PERCENTAGE_OFF', 'FREE_MENU_ITEM']).default('DISCOUNT_FIXED'),
    rewardValue: zod_1.z.coerce.number().min(0).default(0),
    menuItemId: zod_1.z.coerce.number().positive().optional().nullable(),
});
exports.listLoyaltyQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    tierId: zod_1.z.coerce.number().positive().optional(),
    search: zod_1.z.string().trim().optional(),
});
