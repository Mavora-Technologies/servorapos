// apps/api/src/validators/pricing.validator.ts
import { z } from 'zod';

export const updateBasePriceSchema = z.object({
  menuItemId: z.coerce.number().positive(),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
});

export const bulkUpdatePricesSchema = z.object({
  updates: z.array(
    z.object({
      id: z.coerce.number().positive(),
      price: z.coerce.number().min(0),
    })
  ).min(1, 'At least one price update required'),
});

export const createPricingRuleSchema = z.object({
  menuItemId: z.coerce.number().positive('Menu item is required'),
  ruleName: z.string().min(2, 'Rule name is required'),
  ruleType: z.enum(['FIXED_PRICE', 'PERCENTAGE_DISCOUNT', 'SURGE_ADDITION']),
  value: z.coerce.number().min(0, 'Value must be non-negative'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  daysOfWeek: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;