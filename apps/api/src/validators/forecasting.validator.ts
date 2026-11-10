import { z } from 'zod';

export const forecastingQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  horizonDays: z.coerce.number().int().min(3).max(30).default(7),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  weatherCondition: z.enum(['CLEAR_NORMAL', 'RAIN_HEAVY', 'HEATWAVE', 'COLD_SNAP']).default('CLEAR_NORMAL'),
  targetLaborCostPct: z.coerce.number().min(10).max(40).default(22.0), // e.g. target 22% labor to revenue
});

export const adjustForecastModifierSchema = z.object({
  snapshotId: z.coerce.number().positive('Snapshot ID is required'),
  localEventModifier: z.string().trim().max(150).optional().nullable(),
  varianceAdjustmentPct: z.coerce.number().min(-30).max(50).default(0), // Manual operational hedge
});

export type ForecastingQuery = z.infer<typeof forecastingQuerySchema>;
export type AdjustForecastModifierInput = z.infer<typeof adjustForecastModifierSchema>;