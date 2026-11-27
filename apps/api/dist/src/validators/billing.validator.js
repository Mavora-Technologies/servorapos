"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleInvoiceSchema = exports.listInvoicesQuerySchema = exports.addPaymentMethodSchema = exports.updateSubscriptionPlanSchema = exports.INVOICE_STATUSES = exports.PAYMENT_METHOD_TYPES = void 0;
// apps/api/src/validators/billing.validator.ts
const zod_1 = require("zod");
exports.PAYMENT_METHOD_TYPES = [
    'CARD',
    'MPESA_STANDING_ORDER',
    'DIRECT_DEBIT',
    'CORPORATE_INVOICE',
];
exports.INVOICE_STATUSES = [
    'DRAFT',
    'PENDING',
    'PAID',
    'OVERDUE',
    'VOID',
    'ALL',
];
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
exports.updateSubscriptionPlanSchema = zod_1.z.object({
    planId: zod_1.z.coerce.number().int().positive('Valid plan identifier is required'),
    seatAllocation: zod_1.z.coerce.number().int().min(1, 'At least 1 operator seat is required'),
    branchAllocation: zod_1.z.coerce.number().int().min(1, 'At least 1 branch allocation is required'),
    autoRenew: zod_1.z.boolean().default(true),
    cancelAtPeriodEnd: zod_1.z.boolean().optional().default(false),
});
exports.addPaymentMethodSchema = zod_1.z.object({
    type: zod_1.z.enum(exports.PAYMENT_METHOD_TYPES),
    provider: zod_1.z.string().trim().min(2, 'Provider identifier is required').max(50),
    accountMask: zod_1.z.string().trim().min(3, 'Card or account mask reference is required').max(50),
    brandOrBank: optionalTrimmed,
    expiryMonth: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().min(1).max(12).nullable()),
    expiryYear: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().min(2025).max(2045).nullable()),
    token: zod_1.z.string().trim().min(4, 'Token authorization reference is required').max(255),
    isDefault: zod_1.z.boolean().default(false),
});
exports.listInvoicesQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(exports.INVOICE_STATUSES).default('ALL'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.settleInvoiceSchema = zod_1.z.object({
    invoiceId: zod_1.z.coerce.number().int().positive('Invoice identifier is required'),
    paymentMethodId: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().positive().nullable().optional()),
    manualReference: optionalTrimmed,
});
