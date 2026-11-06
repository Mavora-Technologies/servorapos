"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBankStatementSchema = exports.matchStatementLineSchema = exports.directReconcilePaymentSchema = void 0;
const zod_1 = require("zod");
exports.directReconcilePaymentSchema = zod_1.z.object({
    bankStatementRef: zod_1.z.string().trim().min(1, 'Statement reference is required'),
});
exports.matchStatementLineSchema = zod_1.z.object({
    statementLineId: zod_1.z.coerce.number().positive('Bank statement line ID is required'),
    paymentId: zod_1.z.coerce.number().positive('ERP Payment ID is required'),
});
exports.createBankStatementSchema = zod_1.z.object({
    clearingAccount: zod_1.z.string().min(2, 'Clearing account is required'),
    statementNumber: zod_1.z.string().min(2, 'Statement number is required'),
    openingBalance: zod_1.z.coerce.number(),
    closingBalance: zod_1.z.coerce.number(),
    statementDate: zod_1.z.string(),
    lines: zod_1.z.array(zod_1.z.object({
        lineDate: zod_1.z.string(),
        transactionReference: zod_1.z.string().optional().nullable(),
        description: zod_1.z.string().min(1),
        amount: zod_1.z.coerce.number(),
    })).min(1, 'At least one bank statement transaction line is required'),
});
