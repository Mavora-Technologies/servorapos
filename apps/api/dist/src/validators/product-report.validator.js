"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportProductReportSchema = exports.productReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.productReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    categoryId: zod_1.z.coerce.number().positive().optional(),
    stockTrackingType: zod_1.z.enum(['RECIPE', 'STOCKED_PRODUCT', 'COMPOSITE', 'NON_TRACKED', 'ALL']).default('ALL'),
    kitchenStation: zod_1.z.string().trim().optional(),
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
    sortBy: zod_1.z.enum(['REVENUE', 'QUANTITY', 'PROFIT', 'MARGIN', 'WASTAGE']).default('REVENUE'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
});
exports.exportProductReportSchema = exports.productReportQuerySchema.extend({
    exportType: zod_1.z.enum(['PRODUCT_MATRIX', 'CATEGORY_BREAKDOWN', 'ABC_ANALYSIS', 'RECIPE_COGS_AUDIT']).default('PRODUCT_MATRIX'),
});
