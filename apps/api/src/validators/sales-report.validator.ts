import { z } from 'zod';

export const salesReportIntervalEnum = z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']);

export const salesReportQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  serviceModelId: z.coerce.number().positive().optional(),
  cashierId: z.coerce.number().positive().optional(),
  serverId: z.coerce.number().positive().optional(),
  paymentMethod: z.string().trim().optional(),
  categoryId: z.coerce.number().positive().optional(),
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
  interval: salesReportIntervalEnum.default('DAY'),
  format: z.enum(['JSON', 'CSV']).default('JSON'),
});

export const exportSalesReportSchema = salesReportQuerySchema.extend({
  exportType: z.enum(['SUMMARY', 'LINE_ITEMS', 'PAYMENT_TENDERS', 'TAX_SCHEDULE']).default('SUMMARY'),
});

export type SalesReportQuery = z.infer<typeof salesReportQuerySchema>;
export type ExportSalesReportInput = z.infer<typeof exportSalesReportSchema>;