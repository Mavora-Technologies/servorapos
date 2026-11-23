// apps/api/src/validators/pricing.validator.ts
import { z } from 'zod';

export const PRICING_RULE_TYPES = [
  'FIXED_PRICE',
  'PERCENTAGE_DISCOUNT',
  'SURGE_ADDITION',
] as const;

export const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const optionalTime = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional()
  .refine((val) => !val || timeRegex.test(val), {
    message: 'Time must be in 24-hour HH:MM format (e.g. 17:00)',
  });

const normalizedDaysOfWeek = z
  .string()
  .trim()
  .transform((val) => (val === '' ? 'ALL' : val.toUpperCase()))
  .optional()
  .default('ALL')
  .refine(
    (val) => {
      if (val === 'ALL') return true;
      const parts = val.split(',').map((d) => d.trim()).filter(Boolean);
      return (
        parts.length > 0 &&
        parts.every((d) => (VALID_DAYS as readonly string[]).includes(d))
      );
    },
    { message: 'Days of week must be ALL or comma-separated codes (MON,TUE,WED,THU,FRI,SAT,SUN)' }
  );

export const updateBasePriceSchema = z.object({
  menuItemId: z.coerce.number().int().positive('Valid menu item ID is required'),
  price: z.coerce.number().min(0, 'Price must be zero or greater'),
});

export const bulkUpdatePricesSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.coerce.number().int().positive('Valid menu item ID is required'),
        price: z.coerce.number().min(0, 'Price must be zero or greater'),
      })
    )
    .min(1, 'At least one price update is required'),
});

const pricingRuleBaseSchema = z.object({
  menuItemId: z.coerce.number().int().positive('Target menu item is required'),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  ruleName: z.string().trim().min(2, 'Rule name must be at least 2 characters').max(150),
  ruleType: z.enum(PRICING_RULE_TYPES),
  value: z.coerce.number().min(0, 'Rule value must be zero or greater'),
  startTime: optionalTime,
  endTime: optionalTime,
  daysOfWeek: normalizedDaysOfWeek,
  isActive: z.boolean().default(true),
});

export const createPricingRuleSchema = pricingRuleBaseSchema.superRefine((data, ctx) => {
  if (data.ruleType === 'PERCENTAGE_DISCOUNT' && (data.value <= 0 || data.value > 100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'Percentage discount must be between 0.01% and 100%.',
    });
  }
  if ((data.startTime && !data.endTime) || (!data.startTime && data.endTime)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endTime'],
      message: 'Provide both start time and end time, or leave both blank for all-day rules.',
    });
  }
});

// Zod v4 safe: .partial() applied on unrefined base schema
export const updatePricingRuleSchema = pricingRuleBaseSchema.partial();

export type BulkUpdatePricesInput = z.infer<typeof bulkUpdatePricesSchema>;
export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>;
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>;