import { z } from 'zod';

export const loyaltyTransactionsQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  customerId: z.coerce.number().positive().optional(),
  entryType: z.enum(['ACCRUAL_PURCHASE', 'REDEMPTION_VOUCHER', 'MANUAL_ADJUSTMENT', 'EXPIRY_DEDUCTION', 'TIER_BONUS', 'ALL']).default('ALL'),
  channel: z.string().trim().optional(),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  sortBy: z.enum(['CREATED_AT', 'POINTS', 'VALUE']).default('CREATED_AT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const exportLoyaltyTransactionsSchema = loyaltyTransactionsQuerySchema.extend({
  exportType: z.enum(['LEDGER_AUDIT', 'ACCRUAL_SUMMARY', 'REDEMPTION_LOG']).default('LEDGER_AUDIT'),
});

export type LoyaltyTransactionsQuery = z.infer<typeof loyaltyTransactionsQuerySchema>;
export type ExportLoyaltyTransactionsInput = z.infer<typeof exportLoyaltyTransactionsSchema>;