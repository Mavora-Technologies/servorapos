"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGoodsReceivedSchema = exports.receivePOItemSchema = void 0;
const zod_1 = require("zod");
exports.receivePOItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive(),
    quantityAccepted: zod_1.z.coerce.number().min(0, 'Accepted quantity cannot be negative'),
    quantityRejected: zod_1.z.coerce.number().min(0).default(0),
    unitCost: zod_1.z.coerce.number().min(0),
    rejectionReason: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createGoodsReceivedSchema = zod_1.z.object({
    purchaseOrderId: zod_1.z.coerce.number().positive('Purchase Order ID is required'),
    supplierDeliveryNote: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.receivePOItemSchema).min(1, 'At least one line item must be received'),
});
