// apps/api/src/validators/stock-count.validator.ts
import { z } from 'zod';

export const COUNT_TYPES = ['FULL', 'CYCLE', 'SPOT_CHECK'] as const;

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const initiateStockCountSchema = z
  .object({
    countType: z.enum(COUNT_TYPES).default('FULL'),
    category: optionalTrimmed,
    isBlindCount: z.boolean().default(true),
    notes: optionalTrimmed,
  })
  .superRefine((data, ctx) => {
    if (data.countType === 'CYCLE' && !data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['category'],
        message: 'A target category is required for a Cycle Count audit.',
      });
    }
  });

export const updateCountLineSchema = z.object({
  countedQuantity: z.coerce.number().min(0, 'Physical count must be zero or greater'),
  notes: optionalTrimmed,
});

export const reconcileStockCountSchema = z.object({
  notes: optionalTrimmed,
});

export type InitiateStockCountInput = z.infer<typeof initiateStockCountSchema>;
export type UpdateCountLineInput = z.infer<typeof updateCountLineSchema>;
export type ReconcileStockCountInput = z.infer<typeof reconcileStockCountSchema>;