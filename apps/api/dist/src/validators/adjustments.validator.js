"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewAdjustmentSchema = exports.createAdjustmentSchema = exports.listAdjustmentsQuerySchema = void 0;
const zod_1 = require("zod");
exports.listAdjustmentsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.enum(['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'POSTED']).default('ALL'),
    adjustmentType: zod_1.z.enum([
        'ALL',
        'TILL_VARIANCE_WRITE_OFF',
        'PAYROLL_LABOR_DEDUCTION',
        'TIP_POOL_CORRECTION',
        'BANK_RECON_VARIANCE',
        'VENDOR_AP_CREDIT',
        'GUEST_AR_WRITE_DOWN',
    ]).default('ALL'),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
exports.createAdjustmentSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    adjustmentType: zod_1.z.enum([
        'TILL_VARIANCE_WRITE_OFF',
        'PAYROLL_LABOR_DEDUCTION',
        'TIP_POOL_CORRECTION',
        'BANK_RECON_VARIANCE',
        'VENDOR_AP_CREDIT',
        'GUEST_AR_WRITE_DOWN',
    ]),
    shiftId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    attributedUserId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    amount: zod_1.z.coerce.number().positive('Adjustment amount must be greater than zero'),
    adjustmentDirection: zod_1.z.enum(['DEBIT', 'CREDIT']).default('DEBIT'),
    debitGlAccount: zod_1.z.string().trim().min(3, 'Debit GL account is required').max(50),
    creditGlAccount: zod_1.z.string().trim().min(3, 'Credit GL account is required').max(50),
    reasonCode: zod_1.z.enum([
        'DRAWER_DISCREPANCY',
        'COUNTERFEIT_NOTE',
        'UNRESOLVED_DRIFT',
        'BANK_FEE_CORRECTION',
        'TRANSACTION_CORRECTION',
        'STAFF_SHORTAGE_RECOVERY',
        'TIP_CALCULATION_CORRECTION',
    ]),
    justificationNotes: zod_1.z.string().trim().min(5, 'Detailed business justification is required').max(1000),
    supportingDocumentUrl: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal('')),
});
exports.reviewAdjustmentSchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVE', 'REJECT', 'POST']),
    rejectionReason: zod_1.z.string().trim().max(500).optional().nullable(),
});
