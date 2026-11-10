"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportFoodCostingReportSchema = exports.foodCostingReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.foodCostingReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    categoryId: zod_1.z.coerce.number().positive().optional(),
    kitchenStation: zod_1.z.string().trim().optional(),
    costHealthStatus: zod_1.z.enum(['ALL', 'OPTIMAL', 'WARNING', 'CRITICAL_HIGH_COST']).default('ALL'),
    startDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    endDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    sortBy: zod_1.z.enum(['FOOD_COST_PERCENT', 'THEORETICAL_COST', 'MARGIN_VARIANCE', 'RECIPE_PROFIT', 'NAME']).default('FOOD_COST_PERCENT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
});
exports.exportFoodCostingReportSchema = exports.foodCostingReportQuerySchema.extend({
    exportType: zod_1.z.enum(['RECIPE_BOM_LEDGER', 'INGREDIENT_SENSITIVITY', 'CATEGORY_MARGIN_SUMMARY']).default('RECIPE_BOM_LEDGER'),
});
