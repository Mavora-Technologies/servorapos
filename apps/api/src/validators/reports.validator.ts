import { z } from 'zod';

export const reportCategoryEnum = z.enum([
  'WORKFORCE_HCM',
  'REVENUE_SALES',
  'OPERATIONS_KDS',
  'COMPLIANCE_AUDIT',
]);

export const reportFormatEnum = z.enum(['CSV', 'JSON', 'PDF', 'XLSX']);

export const generateReportSchema = z.object({
  reportCode: z.string().trim().min(2, 'Report code identifier is required'),
  branchId: z.coerce.number().positive().optional().nullable(),
  format: reportFormatEnum.default('CSV'),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  filters: z.record(z.string(), z.any()).optional().default({}),
});

export const createReportScheduleSchema = z.object({
  reportDefinitionId: z.coerce.number().positive('Report definition ID is required'),
  branchId: z.coerce.number().positive().optional().nullable(),
  title: z.string().trim().min(3, 'Schedule title must be at least 3 characters'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'END_OF_SHIFT']).default('WEEKLY'),
  deliveryChannel: z.enum(['EMAIL', 'WEBHOOK', 'STORAGE']).default('EMAIL'),
  recipients: z.array(z.string().trim().min(3)).min(1, 'At least one recipient email or webhook is required'),
  format: reportFormatEnum.default('CSV'),
  isActive: z.boolean().default(true),
});

export const updateReportScheduleSchema = createReportScheduleSchema.partial();

export const listExecutionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.string().trim().optional(),
  reportCode: z.string().trim().optional(),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type CreateReportScheduleInput = z.infer<typeof createReportScheduleSchema>;
export type UpdateReportScheduleInput = z.infer<typeof updateReportScheduleSchema>;
export type ListExecutionsQuery = z.infer<typeof listExecutionsQuerySchema>;