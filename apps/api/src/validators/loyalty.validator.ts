import { z } from 'zod';

export const loyaltyAdjustmentReasonEnum = z.enum([
  'SERVICE_RECOVERY',          // Comps for kitchen delay, order mistake, etc.
  'VIP_COURTESY',              // Management goodwill gesture
  'DISPUTE_RESOLUTION',        // Resolution of a billing/point discrepancy
  'PROMOTIONAL_ENROLLMENT',    // Welcome onboard credit
  'ANNIVERSARY_BONUS',         // Birthday or membership milestone
  'MANUAL_RECONCILIATION',     // System or bookkeeping adjustment
  'POINTS_EXPIRY_OVERRIDE',    // Reinstating expired points
  'FRAUD_PREVENTION_REVOKE',   // Revoking fraudulent or erroneous points
]);

export const loyaltyAdjustmentActionEnum = z.enum(['CREDIT', 'DEBIT']);

export const adjustLoyaltyPointsSchema = z.object({
  customerId: z.coerce.number().positive('Valid customer ID is required'),
  action: loyaltyAdjustmentActionEnum.default('CREDIT'),
  points: z.coerce.number().int().positive('Point magnitude must be greater than zero'),
  reasonCode: loyaltyAdjustmentReasonEnum,
  notes: z.string().trim().min(3, 'Detailed justification note is required (min 3 characters)'),
  referenceNumber: z.string().trim().optional(), // e.g. Support ticket # or Order #
});

export const createLoyaltyTierSchema = z.object({
  name: z.string().trim().min(2, 'Tier name is required'),
  minPoints: z.coerce.number().int().min(0).default(0),
  earningMultiplier: z.coerce.number().min(0.1).default(1.0),
  perks: z.array(z.string().trim()).default([]),
});

export const updateLoyaltyTierSchema = createLoyaltyTierSchema.partial();

export const createRewardCatalogItemSchema = z.object({
  name: z.string().trim().min(2, 'Reward name is required'),
  description: z.string().trim().optional(),
  pointsCost: z.coerce.number().int().positive('Points cost must be greater than zero'),
  rewardType: z.enum(['DISCOUNT_FIXED', 'PERCENTAGE_OFF', 'FREE_MENU_ITEM']).default('DISCOUNT_FIXED'),
  rewardValue: z.coerce.number().min(0).default(0),
  menuItemId: z.coerce.number().positive().optional().nullable(),
});

export const listLoyaltyQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  tierId: z.coerce.number().positive().optional(),
  search: z.string().trim().optional(),
});

export type LoyaltyAdjustmentReason = z.infer<typeof loyaltyAdjustmentReasonEnum>;
export type LoyaltyAdjustmentAction = z.infer<typeof loyaltyAdjustmentActionEnum>;
export type AdjustLoyaltyPointsInput = z.infer<typeof adjustLoyaltyPointsSchema>;
export type CreateLoyaltyTierInput = z.infer<typeof createLoyaltyTierSchema>;
export type UpdateLoyaltyTierInput = z.infer<typeof updateLoyaltyTierSchema>;
export type CreateRewardCatalogItemInput = z.infer<typeof createRewardCatalogItemSchema>;
export type ListLoyaltyQuery = z.infer<typeof listLoyaltyQuerySchema>;