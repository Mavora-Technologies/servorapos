"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWasteLogSchema = void 0;
const zod_1 = require("zod");
exports.createWasteLogSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item is required'),
    inventoryBatchId: zod_1.z.coerce.number().positive().optional().nullable(),
    department: zod_1.z.enum(['KITCHEN', 'BAR', 'BAKERY', 'BUTCHERY', 'MAIN_STORE', 'FLOOR']).default('KITCHEN'),
    wasteReason: zod_1.z.enum([
        'EXPIRED',
        'SPOILED_STORAGE',
        'OVERCOOKED_BURNED',
        'DROPPED_DAMAGED',
        'PREP_ERROR',
        'OVER_PORTIONED',
        'EQUIPMENT_FAILURE',
    ]),
    dispositionMethod: zod_1.z.enum(['TRASH_LANDFILL', 'COMPOST_ORGANIC', 'STAFF_FEEDING', 'SUPPLIER_CLAIM']).default('TRASH_LANDFILL'),
    quantity: zod_1.z.coerce.number().positive('Waste quantity must be greater than zero'),
    unitCost: zod_1.z.coerce.number().min(0).optional(),
    locationBin: zod_1.z.string().trim().optional().nullable(),
    witnessName: zod_1.z.string().trim().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    loggedAt: zod_1.z.string().optional(),
});
