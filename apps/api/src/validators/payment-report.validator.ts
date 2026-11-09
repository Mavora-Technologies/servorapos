import { z } from 'zod';

export const paymentReportQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  paymentFlow: z.enum(['INBOUND_AR', 'OUTBOUND_AP', 'ALL']).default('ALL'),
  paymentMethod: z.string().trim().optional(),
  clearingAccount: z.string().trim().optional(),
  status: z.enum(['POSTED', 'RECONCILED', 'CANCELLED_REVERSED', 'BOUNCED', 'ALL']).default('ALL'),
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
  interval: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']).default('DAY'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const exportPaymentReportSchema = paymentReportQuerySchema.extend({
  exportType: z.enum(['LEDGER_TRANSACTIONS', 'CLEARING_ACCOUNTS', 'DAILY_TENDER_SUMMARY']).default('LEDGER_TRANSACTIONS'),
});

export type PaymentReportQuery = z.infer<typeof paymentReportQuerySchema>;
export type ExportPaymentReportInput = z.infer<typeof exportPaymentReportSchema>;