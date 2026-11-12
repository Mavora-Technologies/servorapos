import { z } from 'zod';

export const posBootstrapQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
});

export const posCustomerSearchQuerySchema = z.object({
  search: z.string().trim().min(1, 'Search query is required'),
});

export const posValidatePromoSchema = z.object({
  code: z.string().trim().min(2).max(50),
  subtotalKes: z.coerce.number().min(0),
});

export type PosBootstrapQuery = z.infer<typeof posBootstrapQuerySchema>;
export type PosCustomerSearchQuery = z.infer<typeof posCustomerSearchQuerySchema>;
export type PosValidatePromoInput = z.infer<typeof posValidatePromoSchema>;