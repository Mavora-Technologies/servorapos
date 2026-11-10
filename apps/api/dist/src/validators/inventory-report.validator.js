"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportInventoryReportSchema = exports.inventoryReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.inventoryReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    category: zod_1.z.string().trim().optional(),
    materialType: zod_1.z.enum(['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'CONSUMABLE', 'ALL']).default('ALL'),
    stockStatus: zod_1.z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'CRITICAL_EXPIRY']).default('ALL'),
    storageCondition: zod_1.z.string().trim().optional(),
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
    sortBy: zod_1.z.enum(['VALUATION', 'STOCK_LEVEL', 'TURNOVER', 'NAME', 'WASTAGE']).default('VALUATION'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
});
exports.exportInventoryReportSchema = exports.inventoryReportQuerySchema.extend({
    exportType: zod_1.z.enum(['STOCK_ON_HAND', 'WASTE_SCRAP_LEDGER', 'BATCH_EXPIRY_SCHEDULE', 'MOVEMENT_AUDIT']).default('STOCK_ON_HAND'),
});
