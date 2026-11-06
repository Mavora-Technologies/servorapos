"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcilePaymentSchema = exports.reversePaymentSchema = exports.createPaymentSchema = void 0;
const zod_1 = require("zod");
exports.createPaymentSchema = zod_1.z.object({
    paymentFlow: zod_1.z.enum(['OUTBOUND_AP', 'INBOUND_AR']),
    paymentMethod: zod_1.z.enum(['MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH_DRAWER', 'CREDIT_CARD']),
    clearingAccount: zod_1.z.string().min(2, 'Clearing treasury channel is required').trim(),
    amount: zod_1.z.coerce.number().positive('Payment amount must be greater than zero'),
    transactionReference: zod_1.z.string().trim().optional().nullable(),
    supplierId: zod_1.z.coerce.number().positive().optional().nullable(),
    supplierInvoiceId: zod_1.z.coerce.number().positive().optional().nullable(),
    orderId: zod_1.z.coerce.number().positive().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.reversePaymentSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3, 'Audit reversal reason is required'),
});
exports.reconcilePaymentSchema = zod_1.z.object({
    bankStatementRef: zod_1.z.string().min(2, 'Bank statement reference is required'),
});
