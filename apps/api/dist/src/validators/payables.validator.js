"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupplierInvoiceSchema = exports.recordPayableDisbursementSchema = exports.listPayablesQuerySchema = void 0;
const zod_1 = require("zod");
exports.listPayablesQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    supplierId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.enum(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'DISPUTED']).default('ALL'),
    agingBucket: zod_1.z.enum(['ALL', 'CURRENT', 'PAST_DUE_30', 'PAST_DUE_60', 'PAST_DUE_90_PLUS']).default('ALL'),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
exports.recordPayableDisbursementSchema = zod_1.z.object({
    invoiceId: zod_1.z.coerce.number().int().positive('Supplier invoice ID is required'),
    paymentAmount: zod_1.z.coerce.number().positive('Payment amount must be greater than zero'),
    paymentMethod: zod_1.z.enum(['MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH_DRAWER']),
    clearingAccount: zod_1.z.string().trim().min(2, 'Clearing account must be specified'), // e.g. "KCB Operating Acc", "Safaricom B2B Paybill"
    transactionReference: zod_1.z.string().trim().min(3, 'Transaction or reference code is required').max(100),
    notes: zod_1.z.string().trim().max(500).optional().nullable(),
});
exports.createSupplierInvoiceSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    supplierId: zod_1.z.coerce.number().int().positive('Supplier is required'),
    purchaseOrderId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    goodsReceivedNoteId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    invoiceNumber: zod_1.z.string().trim().min(2, 'Vendor invoice number is required').max(100),
    subtotal: zod_1.z.coerce.number().positive('Subtotal must be greater than zero'),
    taxAmount: zod_1.z.coerce.number().min(0).default(0),
    invoiceDate: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    dueDate: zod_1.z.string().datetime().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    notes: zod_1.z.string().trim().max(1000).optional().nullable(),
});
