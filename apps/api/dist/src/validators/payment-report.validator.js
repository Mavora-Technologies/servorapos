"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPaymentReportSchema = exports.paymentReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.paymentReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    paymentFlow: zod_1.z.enum(['INBOUND_AR', 'OUTBOUND_AP', 'ALL']).default('ALL'),
    paymentMethod: zod_1.z.string().trim().optional(),
    clearingAccount: zod_1.z.string().trim().optional(),
    status: zod_1.z.enum(['POSTED', 'RECONCILED', 'CANCELLED_REVERSED', 'BOUNCED', 'ALL']).default('ALL'),
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
    interval: zod_1.z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH']).default('DAY'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
});
exports.exportPaymentReportSchema = exports.paymentReportQuerySchema.extend({
    exportType: zod_1.z.enum(['LEDGER_TRANSACTIONS', 'CLEARING_ACCOUNTS', 'DAILY_TENDER_SUMMARY']).default('LEDGER_TRANSACTIONS'),
});
