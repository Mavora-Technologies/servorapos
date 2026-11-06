"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createComboBundleSchema = exports.createComboItemSchema = void 0;
// apps/api/src/validators/combo.validator.ts
const zod_1 = require("zod");
exports.createComboItemSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().positive('Menu item is required'),
    quantity: zod_1.z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
    additionalPrice: zod_1.z.coerce.number().min(0).default(0),
});
exports.createComboBundleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Combo bundle name is required'),
    description: zod_1.z.string().optional(),
    sku: zod_1.z.string().optional(),
    basePrice: zod_1.z.coerce.number().min(0, 'Base price must be a valid non-negative number'),
    isAvailable: zod_1.z.boolean().optional().default(true),
    items: zod_1.z.array(exports.createComboItemSchema).min(1, 'Please attach at least one dish or drink to the combo'),
});
