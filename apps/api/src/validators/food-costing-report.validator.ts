import { z } from 'zod';

export const foodCostingReportQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  categoryId: z.coerce.number().positive().optional(),
  kitchenStation: z.string().trim().optional(),
  costHealthStatus: z.enum(['ALL', 'OPTIMAL', 'WARNING', 'CRITICAL_HIGH_COST']).default('ALL'),
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
  sortBy: z.enum(['FOOD_COST_PERCENT', 'THEORETICAL_COST', 'MARGIN_VARIANCE', 'RECIPE_PROFIT', 'NAME']).default('FOOD_COST_PERCENT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().optional(),
});

export const exportFoodCostingReportSchema = foodCostingReportQuerySchema.extend({
  exportType: z.enum(['RECIPE_BOM_LEDGER', 'INGREDIENT_SENSITIVITY', 'CATEGORY_MARGIN_SUMMARY']).default('RECIPE_BOM_LEDGER'),
});

export type FoodCostingReportQuery = z.infer<typeof foodCostingReportQuerySchema>;
export type ExportFoodCostingReportInput = z.infer<typeof exportFoodCostingReportSchema>;