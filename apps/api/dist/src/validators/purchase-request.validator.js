"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewPurchaseRequestSchema = exports.createPurchaseRequestSchema = exports.createPRItemSchema = void 0;
const zod_1 = require("zod");
exports.createPRItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    requestedQuantity: zod_1.z.coerce.number().positive('Requested quantity must be greater than zero'),
    notes: zod_1.z.string().optional().nullable(),
});
exports.createPurchaseRequestSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    department: zod_1.z.enum(['KITCHEN', 'BAR', 'PASTRY', 'FLOOR', 'MAINTENANCE']).default('KITCHEN'),
    priority: zod_1.z.enum(['LOW', 'NORMAL', 'URGENT']).default('NORMAL'),
    notes: zod_1.z.string().optional().nullable(),
    items: zod_1.z.array(exports.createPRItemSchema).min(1, 'At least one item is required in the request'),
});
exports.reviewPurchaseRequestSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
