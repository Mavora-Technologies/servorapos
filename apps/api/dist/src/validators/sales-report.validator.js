"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSalesReportSchema = exports.salesReportQuerySchema = exports.salesReportIntervalEnum = void 0;
const zod_1 = require("zod");
exports.salesReportIntervalEnum = zod_1.z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']);
exports.salesReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    serviceModelId: zod_1.z.coerce.number().positive().optional(),
    cashierId: zod_1.z.coerce.number().positive().optional(),
    serverId: zod_1.z.coerce.number().positive().optional(),
    paymentMethod: zod_1.z.string().trim().optional(),
    categoryId: zod_1.z.coerce.number().positive().optional(),
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
    interval: exports.salesReportIntervalEnum.default('DAY'),
    format: zod_1.z.enum(['JSON', 'CSV']).default('JSON'),
});
exports.exportSalesReportSchema = exports.salesReportQuerySchema.extend({
    exportType: zod_1.z.enum(['SUMMARY', 'LINE_ITEMS', 'PAYMENT_TENDERS', 'TAX_SCHEDULE']).default('SUMMARY'),
});
