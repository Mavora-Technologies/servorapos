"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleInvoiceSchema = exports.listInvoicesQuerySchema = exports.addPaymentMethodSchema = exports.updateSubscriptionPlanSchema = void 0;
const zod_1 = require("zod");
exports.updateSubscriptionPlanSchema = zod_1.z.object({
    planId: zod_1.z.coerce.number().positive('Valid plan identifier is required'),
    seatAllocation: zod_1.z.coerce.number().int().min(1, 'At least 1 operator seat is required'),
    branchAllocation: zod_1.z.coerce.number().int().min(1, 'At least 1 branch allocation is required'),
    autoRenew: zod_1.z.boolean().default(true),
});
exports.addPaymentMethodSchema = zod_1.z.object({
    type: zod_1.z.enum(['CARD', 'MPESA_STANDING_ORDER', 'DIRECT_DEBIT', 'CORPORATE_INVOICE']),
    provider: zod_1.z.string().trim().min(2, 'Provider identifier is required'),
    accountMask: zod_1.z.string().trim().min(3, 'Card or account mask reference is required'),
    brandOrBank: zod_1.z.string().trim().optional().nullable(),
    expiryMonth: zod_1.z.coerce.number().int().min(1).max(12).optional().nullable(),
    expiryYear: zod_1.z.coerce.number().int().min(2025).max(2040).optional().nullable(),
    token: zod_1.z.string().trim().min(2, 'Token authorization reference is required'),
    isDefault: zod_1.z.boolean().default(false),
});
exports.listInvoicesQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'VOID', 'ALL']).default('ALL'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.settleInvoiceSchema = zod_1.z.object({
    invoiceId: zod_1.z.coerce.number().positive('Invoice identifier is required'),
    paymentMethodId: zod_1.z.coerce.number().positive().optional().nullable(),
    manualReference: zod_1.z.string().trim().optional().nullable(),
});
