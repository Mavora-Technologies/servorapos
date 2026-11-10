import { z } from 'zod';

export const financeHubQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  period: z.enum(['TODAY', 'THIS_MONTH', 'THIS_QUARTER', 'THIS_YEAR']).default('THIS_MONTH'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type FinanceHubQuery = z.infer<typeof financeHubQuerySchema>;