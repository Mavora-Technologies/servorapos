"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportCustomReportSchema = exports.saveCustomReportDefinitionSchema = exports.runCustomReportPreviewSchema = exports.customReportConfigSchema = exports.reportFilterCriterionSchema = exports.reportFieldSelectionSchema = exports.filterOperatorEnum = exports.aggregationFunctionEnum = exports.subjectAreaEnum = void 0;
const zod_1 = require("zod");
exports.subjectAreaEnum = zod_1.z.enum([
    'ORDERS_REVENUE',
    'INVENTORY_STOCK',
    'PAYMENTS_SETTLEMENTS',
    'WORKFORCE_ATTENDANCE',
    'MENU_PRODUCT_SALES',
]);
exports.aggregationFunctionEnum = zod_1.z.enum(['NONE', 'SUM', 'AVG', 'COUNT', 'MIN', 'MAX']);
exports.filterOperatorEnum = zod_1.z.enum([
    'EQUALS',
    'NOT_EQUALS',
    'CONTAINS',
    'GREATER_THAN',
    'GREATER_THAN_OR_EQUAL',
    'LESS_THAN',
    'LESS_THAN_OR_EQUAL',
    'BETWEEN',
    'IN',
    'IS_NULL',
    'IS_NOT_NULL',
]);
exports.reportFieldSelectionSchema = zod_1.z.object({
    fieldKey: zod_1.z.string().trim().min(1, 'Field key is required'),
    customLabel: zod_1.z.string().trim().optional(),
    aggregation: exports.aggregationFunctionEnum.default('NONE'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC', 'NONE']).default('NONE'),
    sortPriority: zod_1.z.number().int().optional(),
});
exports.reportFilterCriterionSchema = zod_1.z.object({
    fieldKey: zod_1.z.string().trim().min(1, 'Filter field key is required'),
    operator: exports.filterOperatorEnum,
    value: zod_1.z.any().optional(),
    valueTo: zod_1.z.any().optional(), // For 'BETWEEN' conditions
});
exports.customReportConfigSchema = zod_1.z.object({
    subjectArea: exports.subjectAreaEnum,
    selectedFields: zod_1.z.array(exports.reportFieldSelectionSchema).min(1, 'Select at least one column field'),
    filters: zod_1.z.array(exports.reportFilterCriterionSchema).default([]),
    groupByFields: zod_1.z.array(zod_1.z.string().trim()).default([]),
    dateRange: zod_1.z
        .object({
        startDate: zod_1.z.string().optional(),
        endDate: zod_1.z.string().optional(),
    })
        .optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(1000).default(100),
});
exports.runCustomReportPreviewSchema = exports.customReportConfigSchema;
exports.saveCustomReportDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Report title must be at least 3 characters').max(150),
    description: zod_1.z.string().trim().max(500).default('User-defined custom report'),
    category: zod_1.z.enum(['WORKFORCE_HCM', 'REVENUE_SALES', 'OPERATIONS_KDS', 'COMPLIANCE_AUDIT']).default('REVENUE_SALES'),
    config: exports.customReportConfigSchema,
});
exports.exportCustomReportSchema = exports.customReportConfigSchema.extend({
    format: zod_1.z.enum(['CSV', 'JSON']).default('CSV'),
    reportName: zod_1.z.string().trim().default('custom-report'),
});
