"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDataExportsQuerySchema = exports.requestDataExportSchema = exports.exportFormatEnum = exports.exportDomainEnum = void 0;
const zod_1 = require("zod");
exports.exportDomainEnum = zod_1.z.enum([
    'SALES_REVENUE',
    'INVENTORY_VALUATION',
    'PAYMENTS_TREASURY',
    'WORKFORCE_HCM',
    'FOOD_COSTING',
    'AUDIT_LOGS',
]);
exports.exportFormatEnum = zod_1.z.enum(['CSV', 'XLSX', 'JSON']);
exports.requestDataExportSchema = zod_1.z.object({
    domain: exports.exportDomainEnum,
    format: exports.exportFormatEnum.default('CSV'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    includeMetadata: zod_1.z.boolean().default(true),
});
exports.listDataExportsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    domain: zod_1.z.string().trim().optional(),
    status: zod_1.z.string().trim().optional(),
});
