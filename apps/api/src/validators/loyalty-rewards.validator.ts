import { z } from 'zod';

export const rewardTypeEnum = z.enum([
  'DISCOUNT_FIXED',
  'PERCENTAGE_OFF',
  'FREE_MENU_ITEM',
  'EXPERIENCE_PERK',
]);

export const createRewardItemSchema = z.object({
  name: z.string().trim().min(2, 'Reward name must be at least 2 characters').max(150),
  description: z.string().trim().max(500).optional(),
  pointsCost: z.coerce.number().int().positive('Point cost must be greater than zero'),
  rewardType: rewardTypeEnum.default('DISCOUNT_FIXED'),
  rewardValue: z.coerce.number().min(0, 'Reward value must be non-negative').default(0),
  maxDiscountCap: z.coerce.number().min(0).optional().nullable(),
  menuItemId: z.coerce.number().positive().optional().nullable(),
  minTierId: z.coerce.number().positive().optional().nullable(),
  maxRedemptionsPerMember: z.coerce.number().int().min(1).optional().nullable(),
  totalInventoryQuota: z.coerce.number().int().min(0).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateRewardItemSchema = createRewardItemSchema.partial();

export const redeemRewardSchema = z.object({
  customerId: z.coerce.number().positive('Customer ID is required'),
  rewardId: z.coerce.number().positive('Reward ID is required'),
  orderId: z.coerce.number().positive().optional().nullable(),
  notes: z.string().trim().optional(),
});

export const listRewardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  rewardType: z.string().trim().optional(),
  minTierId: z.coerce.number().positive().optional(),
  isActive: z.enum(['ALL', 'TRUE', 'FALSE']).default('TRUE'),
  search: z.string().trim().optional(),
});

export type RewardType = z.infer<typeof rewardTypeEnum>;
export type CreateRewardItemInput = z.infer<typeof createRewardItemSchema>;
export type UpdateRewardItemInput = z.infer<typeof updateRewardItemSchema>;
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;
export type ListRewardsQuery = z.infer<typeof listRewardsQuerySchema>;