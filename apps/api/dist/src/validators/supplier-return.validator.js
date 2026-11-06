"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSupplierReturnStatusSchema = exports.createSupplierReturnSchema = exports.createSupplierReturnItemSchema = void 0;
const zod_1 = require("zod");
exports.createSupplierReturnItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    quantity: zod_1.z.coerce.number().positive('Return quantity must be greater than zero'),
    unitCost: zod_1.z.coerce.number().min(0, 'Unit cost must be non-negative'),
    reason: zod_1.z.enum([
        'DEFECTIVE_SPOILED',
        'WRONG_ITEM',
        'BROKEN_PACKAGING',
        'TEMPERATURE_ABUSE',
        'OVER_DELIVERY',
    ]),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createSupplierReturnSchema = zod_1.z.object({
    supplierId: zod_1.z.coerce.number().positive('Supplier selection is required'),
    goodsReceivedNoteId: zod_1.z.coerce.number().positive().optional().nullable(),
    supplierInvoiceId: zod_1.z.coerce.number().positive().optional().nullable(),
    debitNoteNumber: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.createSupplierReturnItemSchema).min(1, 'At least one item must be returned'),
});
exports.updateSupplierReturnStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING_DISPATCH', 'DISPATCHED', 'CREDITED', 'REJECTED']),
    debitNoteNumber: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
