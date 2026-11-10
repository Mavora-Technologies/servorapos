"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performReconciliationAuditSchema = exports.reconciliationQuerySchema = void 0;
const zod_1 = require("zod");
exports.reconciliationQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional(),
    status: zod_1.z.enum(['ALL', 'BALANCED', 'DISCREPANCY', 'PENDING_AUDIT']).default('ALL'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
exports.performReconciliationAuditSchema = zod_1.z.object({
    shiftId: zod_1.z.coerce.number().int().positive('Shift ID is required'),
    actualDepositAmount: zod_1.z.coerce.number().min(0, 'Deposit amount cannot be negative'),
    clearingAccountId: zod_1.z.string().trim().min(2, 'Clearing account must be specified'), // e.g. "Main Safe KES", "KCB Operating Acc"
    auditResolution: zod_1.z.enum(['VERIFIED_BALANCED', 'VARIANCE_ACCEPTED', 'DISPUTED_ESCALATED']),
    auditorNotes: zod_1.z.string().trim().max(1000).optional().nullable(),
});
