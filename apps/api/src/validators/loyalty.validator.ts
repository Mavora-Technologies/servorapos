import { z } from 'zod';

export const createLoyaltyTierSchema = z.object({
  name: z.string().trim().min(2, 'Tier name is required'),
  minPoints: z.coerce.number().int().min(0).default(0),
  earningMultiplier: z.coerce.number().min(0.1).default(1.0),
  perks: z.array(z.string().trim()).default([]),
});

export const updateLoyaltyTierSchema = createLoyaltyTierSchema.partial();

export const adjustLoyaltyPointsSchema = z.object({
  customerId: z.coerce.number().positive(),
  points: z.coerce.number().int(), // Positive or negative adjustment
  transactionType: z.enum(['EARN_PURCHASE', 'REDEEM_REWARD', 'MANUAL_ADJUSTMENT', 'TIER_BONUS']).default('MANUAL_ADJUSTMENT'),
  description: z.string().trim().min(3, 'Audit description required'),
});

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

export type CreateLoyaltyTierInput = z.infer<typeof createLoyaltyTierSchema>;
export type UpdateLoyaltyTierInput = z.infer<typeof updateLoyaltyTierSchema>;
export type AdjustLoyaltyPointsInput = z.infer<typeof adjustLoyaltyPointsSchema>;
export type CreateRewardCatalogItemInput = z.infer<typeof createRewardCatalogItemSchema>;
export type ListLoyaltyQuery = z.infer<typeof listLoyaltyQuerySchema>;