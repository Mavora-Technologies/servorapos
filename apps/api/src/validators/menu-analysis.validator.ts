import { z } from 'zod';

export const matrixClassificationEnum = z.enum(['STAR', 'PLOWHORSE', 'PUZZLE', 'DOG', 'ALL']);

export const menuAnalysisQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  timeframeDays: z.coerce.number().int().min(7).max(90).default(30),
  classification: matrixClassificationEnum.default('ALL'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['UNITS_SOLD', 'REVENUE', 'MARGIN', 'FOOD_COST_PCT']).default('MARGIN'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export const applyPriceRecommendationSchema = z.object({
  menuItemId: z.coerce.number().positive('Menu item ID is required'),
  newSellingPriceKes: z.coerce.number().positive('New price must be greater than zero'),
  justificationNote: z.string().trim().optional(),
});

export type MenuAnalysisQuery = z.infer<typeof menuAnalysisQuerySchema>;
export type ApplyPriceRecommendationInput = z.infer<typeof applyPriceRecommendationSchema>;