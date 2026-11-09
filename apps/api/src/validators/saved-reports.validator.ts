import { z } from 'zod';

export const listSavedReportsQuerySchema = z.object({
  category: z.enum(['ALL', 'WORKFORCE_HCM', 'REVENUE_SALES', 'OPERATIONS_KDS', 'COMPLIANCE_AUDIT']).default('ALL'),
  search: z.string().trim().optional(),
  isScheduled: z.enum(['ALL', 'YES', 'NO']).default('ALL'),
  sortBy: z.enum(['NAME', 'CREATED_AT', 'LAST_RUN', 'EXECUTION_COUNT']).default('CREATED_AT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateSavedReportSchema = z.object({
  name: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.enum(['WORKFORCE_HCM', 'REVENUE_SALES', 'OPERATIONS_KDS', 'COMPLIANCE_AUDIT']).optional(),
  isActive: z.boolean().optional(),
});

export type ListSavedReportsQuery = z.infer<typeof listSavedReportsQuerySchema>;
export type UpdateSavedReportInput = z.infer<typeof updateSavedReportSchema>;