import { z } from 'zod';

export const initiateStockCountSchema = z.object({
  countType: z.enum(['FULL', 'CYCLE', 'SPOT_CHECK']).default('FULL'),
  category: z.string().optional().nullable(),
  isBlindCount: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const updateCountLineSchema = z.object({
  countedQuantity: z.coerce.number().min(0, 'Physical count must be non-negative'),
  notes: z.string().optional().nullable(),
});

export const reconcileStockCountSchema = z.object({
  notes: z.string().optional().nullable(),
});

export type InitiateStockCountInput = z.infer<typeof initiateStockCountSchema>;