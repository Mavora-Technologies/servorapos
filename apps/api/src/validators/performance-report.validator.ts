import { z } from 'zod';

export const performanceReportQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  role: z.string().trim().optional(),
  department: z.enum(['ALL', 'FOH_SERVICE', 'BOH_CULINARY', 'MANAGEMENT', 'CASHIER']).default('ALL'),
  performanceTier: z.enum(['ALL', 'TOP_TIER', 'MEETING_TARGET', 'UNDERPERFORMING']).default('ALL'),
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
  sortBy: z.enum(['SALES', 'TICKETS', 'HOURS_WORKED', 'RATING', 'VOIDS', 'NAME']).default('SALES'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const exportPerformanceReportSchema = performanceReportQuerySchema.extend({
  exportType: z.enum(['STAFF_LEAGUE_TABLE', 'ROLE_BENCHMARKS', 'APPRAISAL_AUDIT']).default('STAFF_LEAGUE_TABLE'),
});

export type PerformanceReportQuery = z.infer<typeof performanceReportQuerySchema>;
export type ExportPerformanceReportInput = z.infer<typeof exportPerformanceReportSchema>;