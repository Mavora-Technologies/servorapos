"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExecutionsQuerySchema = exports.updateReportScheduleSchema = exports.createReportScheduleSchema = exports.generateReportSchema = exports.reportFormatEnum = exports.reportCategoryEnum = void 0;
const zod_1 = require("zod");
exports.reportCategoryEnum = zod_1.z.enum([
    'WORKFORCE_HCM',
    'REVENUE_SALES',
    'OPERATIONS_KDS',
    'COMPLIANCE_AUDIT',
]);
exports.reportFormatEnum = zod_1.z.enum(['CSV', 'JSON', 'PDF', 'XLSX']);
exports.generateReportSchema = zod_1.z.object({
    reportCode: zod_1.z.string().trim().min(2, 'Report code identifier is required'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    format: exports.reportFormatEnum.default('CSV'),
    startDate: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: zod_1.z.string().datetime({ offset: true }).or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().default({}),
});
exports.createReportScheduleSchema = zod_1.z.object({
    reportDefinitionId: zod_1.z.coerce.number().positive('Report definition ID is required'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    title: zod_1.z.string().trim().min(3, 'Schedule title must be at least 3 characters'),
    frequency: zod_1.z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'END_OF_SHIFT']).default('WEEKLY'),
    deliveryChannel: zod_1.z.enum(['EMAIL', 'WEBHOOK', 'STORAGE']).default('EMAIL'),
    recipients: zod_1.z.array(zod_1.z.string().trim().min(3)).min(1, 'At least one recipient email or webhook is required'),
    format: exports.reportFormatEnum.default('CSV'),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateReportScheduleSchema = exports.createReportScheduleSchema.partial();
exports.listExecutionsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    status: zod_1.z.string().trim().optional(),
    reportCode: zod_1.z.string().trim().optional(),
});
