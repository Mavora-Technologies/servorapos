"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePOStatusSchema = exports.createPurchaseOrderSchema = exports.createPOItemSchema = void 0;
const zod_1 = require("zod");
exports.createPOItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    quantityOrdered: zod_1.z.coerce.number().positive('Quantity ordered must be greater than zero'),
    unitCost: zod_1.z.coerce.number().min(0, 'Unit cost must be non-negative'),
    taxRate: zod_1.z.coerce.number().min(0).default(16.0),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createPurchaseOrderSchema = zod_1.z.object({
    supplierId: zod_1.z.coerce.number().positive('Supplier selection is required'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    paymentTerms: zod_1.z.enum(['COD', 'NET_7', 'NET_14', 'NET_30', 'PREPAID']).default('NET_30'),
    deliveryExpectedDate: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.createPOItemSchema).min(1, 'Purchase order must have at least one line item'),
});
exports.updatePOStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'ISSUED', 'CANCELLED']),
    notes: zod_1.z.string().optional().nullable(),
});
