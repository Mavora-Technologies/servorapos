"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefundSchema = void 0;
const zod_1 = require("zod");
exports.createRefundSchema = zod_1.z.object({
    refundFlow: zod_1.z.enum(['AR_CUSTOMER_REFUND', 'AP_VENDOR_REFUND']),
    orderId: zod_1.z.coerce.number().positive().optional().nullable(),
    supplierId: zod_1.z.coerce.number().positive().optional().nullable(),
    paymentId: zod_1.z.coerce.number().positive().optional().nullable(),
    refundMethod: zod_1.z.enum(['MPESA_REFUND', 'BANK_WIRE', 'CASH_DRAWER']),
    clearingAccount: zod_1.z.string().min(2, 'Clearing treasury channel is required').trim(),
    amount: zod_1.z.coerce.number().positive('Refund amount must be greater than zero'),
    restockItems: zod_1.z.boolean().default(true),
    reasonCode: zod_1.z.string().min(2, 'Refund reason code is required').trim(),
    transactionReference: zod_1.z.string().trim().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
