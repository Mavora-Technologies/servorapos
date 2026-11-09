import { z } from 'zod';

export const productReportQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  categoryId: z.coerce.number().positive().optional(),
  stockTrackingType: z.enum(['RECIPE', 'STOCKED_PRODUCT', 'COMPOSITE', 'NON_TRACKED', 'ALL']).default('ALL'),
  kitchenStation: z.string().trim().optional(),
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
  sortBy: z.enum(['REVENUE', 'QUANTITY', 'PROFIT', 'MARGIN', 'WASTAGE']).default('REVENUE'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const exportProductReportSchema = productReportQuerySchema.extend({
  exportType: z.enum(['PRODUCT_MATRIX', 'CATEGORY_BREAKDOWN', 'ABC_ANALYSIS', 'RECIPE_COGS_AUDIT']).default('PRODUCT_MATRIX'),
});

export type ProductReportQuery = z.infer<typeof productReportQuerySchema>;
export type ExportProductReportInput = z.infer<typeof exportProductReportSchema>;