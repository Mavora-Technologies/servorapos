// apps/api/src/validators/recipe-costing.validator.ts
import { z } from 'zod';

export const recipeCostingQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  targetMarginPercent: z.coerce.number().min(10).max(95).default(70),
  alertThresholdPercent: z.coerce.number().min(5).max(95).default(65),
  periodDays: z.coerce.number().int().min(1).max(365).default(30),
  taxBasis: z.enum(['NET', 'GROSS']).default('NET'),
});

export type RecipeCostingQueryInput = z.infer<typeof recipeCostingQuerySchema>;