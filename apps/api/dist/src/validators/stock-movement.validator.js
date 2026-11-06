"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseMovementSchema = exports.createManualMovementSchema = void 0;
const zod_1 = require("zod");
exports.createManualMovementSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    type: zod_1.z.enum([
        'GOODS_RECEIPT_PO',
        'WASTE_SCRAP',
        'PHYSICAL_INVENTORY_ADJ',
        'TRANSFER',
    ]),
    quantityDelta: zod_1.z.coerce.number().refine((val) => val !== 0, 'Quantity delta cannot be zero'),
    unitCost: zod_1.z.coerce.number().min(0).optional(),
    batchNumber: zod_1.z.string().optional().nullable(),
    locationBin: zod_1.z.string().optional().nullable(),
    documentReference: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.reverseMovementSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3, 'Reversal reason is required'),
});
