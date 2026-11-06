"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discardBatchSchema = exports.updateBatchStatusSchema = exports.createBatchSchema = void 0;
const zod_1 = require("zod");
exports.createBatchSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    supplierId: zod_1.z.coerce.number().positive().optional().nullable(),
    batchNumber: zod_1.z.string().min(2, 'Batch/Lot code must be at least 2 characters').trim(),
    supplierBatchNumber: zod_1.z.string().trim().optional().nullable(),
    certificateNumber: zod_1.z.string().trim().optional().nullable(),
    initialQuantity: zod_1.z.coerce.number().positive('Initial quantity must be greater than 0'),
    unitCost: zod_1.z.coerce.number().min(0).optional(),
    locationBin: zod_1.z.string().trim().optional().nullable(),
    storageTemperature: zod_1.z.coerce.number().optional().nullable(),
    receivedDate: zod_1.z.string().optional(),
    expiryDate: zod_1.z.string().min(1, 'Expiration date is required'),
    status: zod_1.z.enum(['ACTIVE', 'QUARANTINE', 'QUALITY_HOLD']).default('ACTIVE'),
    notes: zod_1.z.string().optional().nullable(),
});
exports.updateBatchStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['ACTIVE', 'QUARANTINE', 'QUALITY_HOLD', 'DISCARDED']),
    notes: zod_1.z.string().optional().nullable(),
});
exports.discardBatchSchema = zod_1.z.object({
    quantity: zod_1.z.coerce.number().positive('Discard quantity must be greater than 0'),
    reason: zod_1.z.string().min(2, 'Reason for disposal is required').trim(),
    notes: zod_1.z.string().optional().nullable(),
});
