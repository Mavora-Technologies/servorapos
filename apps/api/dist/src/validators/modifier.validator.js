"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModifierGroupSchema = exports.createModifierOptionSchema = void 0;
// apps/api/src/validators/modifier.validator.ts
const zod_1 = require("zod");
exports.createModifierOptionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Option name is required'),
    priceAdjustment: zod_1.z.coerce.number().min(0, 'Price adjustment must be 0 or higher').default(0),
    isDefault: zod_1.z.boolean().optional().default(false),
    isAvailable: zod_1.z.boolean().optional().default(true),
});
exports.createModifierGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Modifier group name is required'),
    description: zod_1.z.string().optional(),
    minSelections: zod_1.z.coerce.number().min(0).default(0),
    maxSelections: zod_1.z.coerce.number().min(1).default(1),
    isRequired: zod_1.z.boolean().optional().default(false),
    options: zod_1.z.array(exports.createModifierOptionSchema).min(1, 'Provide at least one option'),
});
