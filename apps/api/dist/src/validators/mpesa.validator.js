"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseMpesaTxSchema = exports.initiateB2CPayoutSchema = exports.initiateB2BPaymentSchema = exports.initiateStkPushSchema = void 0;
const zod_1 = require("zod");
exports.initiateStkPushSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^(?:254|\+254|0)?([17]\d{8})$/, 'Invalid Kenyan phone number'),
    amount: zod_1.z.coerce.number().positive('Amount must be greater than zero'),
    accountReference: zod_1.z.string().min(1, 'Account reference is required').trim(),
    orderId: zod_1.z.coerce.number().positive().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.initiateB2BPaymentSchema = zod_1.z.object({
    businessShortCode: zod_1.z.string().min(5, 'Paybill or Till number is required').trim(),
    receiverType: zod_1.z.enum(['PAYBILL', 'BUY_GOODS']).default('PAYBILL'),
    accountReference: zod_1.z.string().min(1, 'Account reference is required').trim(),
    amount: zod_1.z.coerce.number().positive('Amount must be greater than zero'),
    supplierId: zod_1.z.coerce.number().positive().optional().nullable(),
    supplierInvoiceId: zod_1.z.coerce.number().positive().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.initiateB2CPayoutSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().regex(/^(?:254|\+254|0)?([17]\d{8})$/, 'Invalid Kenyan phone number'),
    amount: zod_1.z.coerce.number().positive('Amount must be greater than zero'),
    commandId: zod_1.z.enum(['SalaryPayment', 'BusinessPayment', 'PromotionPayment']).default('BusinessPayment'),
    remarks: zod_1.z.string().min(2, 'Payment remarks required').trim(),
});
exports.reverseMpesaTxSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3, 'Reversal reason is required'),
});
