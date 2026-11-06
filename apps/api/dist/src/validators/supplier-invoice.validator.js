"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordInvoicePaymentSchema = exports.createSupplierInvoiceSchema = exports.createSupplierInvoiceItemSchema = void 0;
const zod_1 = require("zod");
exports.createSupplierInvoiceItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive(),
    quantity: zod_1.z.coerce.number().positive('Quantity must be greater than zero'),
    unitPrice: zod_1.z.coerce.number().min(0, 'Price must be non-negative'),
    taxRate: zod_1.z.coerce.number().min(0).default(16.0),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createSupplierInvoiceSchema = zod_1.z.object({
    supplierId: zod_1.z.coerce.number().positive('Supplier selection is required'),
    purchaseOrderId: zod_1.z.coerce.number().positive().optional().nullable(),
    goodsReceivedNoteId: zod_1.z.coerce.number().positive().optional().nullable(),
    invoiceNumber: zod_1.z.string().min(2, 'Vendor Invoice # is required').trim(),
    invoiceDate: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().min(1, 'Payment Due Date is required'),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.createSupplierInvoiceItemSchema).min(1, 'At least one line item is required'),
});
exports.recordInvoicePaymentSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().positive('Payment amount must be greater than zero'),
    paymentMethod: zod_1.z.enum(['MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH']).default('MPESA_B2B'),
    transactionReference: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
