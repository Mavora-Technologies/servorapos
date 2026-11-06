"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveTransferSchema = exports.dispatchTransferSchema = exports.createTransferSchema = exports.createTransferItemSchema = void 0;
// apps/api/src/validators/stock-transfer.validator.ts
const zod_1 = require("zod");
exports.createTransferItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    requestedQuantity: zod_1.z.coerce.number().positive('Quantity must be greater than zero'),
    unitCost: zod_1.z.coerce.number().min(0).optional(),
});
exports.createTransferSchema = zod_1.z
    .object({
    sourceBranchId: zod_1.z.coerce.number().positive('Source branch is required'),
    destinationBranchId: zod_1.z.coerce.number().positive('Destination branch is required'),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.createTransferItemSchema).min(1, 'At least one item is required for transfer'),
})
    .refine((data) => data.sourceBranchId !== data.destinationBranchId, {
    message: 'Source and destination branches must be different',
    path: ['destinationBranchId'],
});
exports.dispatchTransferSchema = zod_1.z.object({
    carrierVehiclePlate: zod_1.z.string().trim().min(2, 'Vehicle registration plate is required'),
    driverName: zod_1.z.string().trim().min(2, 'Driver or transport agent name is required'),
    dispatchTempProbe: zod_1.z.coerce
        .number()
        .min(-30, 'Temperature below realistic reefer minimum (-30°C)')
        .max(60, 'Temperature above realistic transit maximum (60°C)')
        .optional()
        .nullable(),
    items: zod_1.z
        .array(zod_1.z.object({
        itemId: zod_1.z.coerce.number().positive('Transfer line ID is required'),
        sentQuantity: zod_1.z.coerce.number().positive('Dispatched quantity must be greater than zero'),
        batchNumber: zod_1.z.string().trim().optional().nullable(),
    }))
        .min(1, 'At least one line item must be dispatched'),
    notes: zod_1.z.string().optional().nullable(),
});
exports.receiveTransferSchema = zod_1.z.object({
    arrivalTempProbe: zod_1.z.coerce
        .number()
        .min(-30, 'Temperature below realistic reefer minimum (-30°C)')
        .max(60, 'Temperature above realistic transit maximum (60°C)')
        .optional()
        .nullable(),
    items: zod_1.z
        .array(zod_1.z.object({
        itemId: zod_1.z.coerce.number().positive('Transfer line ID is required'),
        receivedQuantity: zod_1.z.coerce.number().min(0, 'Received quantity must be non-negative'),
        notes: zod_1.z.string().optional().nullable(),
    }))
        .min(1, 'At least one line item must be verified'),
    notes: zod_1.z.string().optional().nullable(),
});
