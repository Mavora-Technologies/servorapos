"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPriceRecommendationSchema = exports.menuAnalysisQuerySchema = exports.matrixClassificationEnum = void 0;
const zod_1 = require("zod");
exports.matrixClassificationEnum = zod_1.z.enum(['STAR', 'PLOWHORSE', 'PUZZLE', 'DOG', 'ALL']);
exports.menuAnalysisQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    timeframeDays: zod_1.z.coerce.number().int().min(7).max(90).default(30),
    classification: exports.matrixClassificationEnum.default('ALL'),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    sortBy: zod_1.z.enum(['UNITS_SOLD', 'REVENUE', 'MARGIN', 'FOOD_COST_PCT']).default('MARGIN'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
});
exports.applyPriceRecommendationSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().positive('Menu item ID is required'),
    newSellingPriceKes: zod_1.z.coerce.number().positive('New price must be greater than zero'),
    justificationNote: zod_1.z.string().trim().optional(),
});
