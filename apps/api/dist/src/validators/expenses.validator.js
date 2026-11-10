"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpensesQuerySchema = exports.updateExpenseStatusSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
exports.createExpenseSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    categoryId: zod_1.z.coerce.number().int().positive('Expense category is required'),
    expenseType: zod_1.z.enum(['EMPLOYEE_REIMBURSEMENT', 'STORE_OPERATIONAL', 'PETTY_CASH_DISBURSEMENT']).default('EMPLOYEE_REIMBURSEMENT'),
    payeeName: zod_1.z.string().trim().max(255).optional().nullable(),
    expenseDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
    amount: zod_1.z.coerce.number().positive('Amount must be greater than zero'),
    taxAmount: zod_1.z.coerce.number().min(0).default(0),
    paymentMethod: zod_1.z.enum(['CASH_DRAWER', 'MPESA_B2C', 'BANK_WIRE', 'PETTY_CASH']).default('CASH_DRAWER'),
    merchantTaxPin: zod_1.z.string().trim().max(50).optional().nullable(),
    receiptNumber: zod_1.z.string().trim().max(100).optional().nullable(),
    receiptAttachmentUrl: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal('')),
    description: zod_1.z.string().trim().min(3, 'Description must be at least 3 characters').max(1000),
});
exports.updateExpenseStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED', 'PAID_DISBURSED']),
    rejectionReason: zod_1.z.string().trim().max(500).optional().nullable(),
    paymentReference: zod_1.z.string().trim().max(100).optional().nullable(),
});
exports.listExpensesQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    categoryId: zod_1.z.coerce.number().int().positive().optional(),
    claimantId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.enum(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID_DISBURSED']).default('ALL'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
