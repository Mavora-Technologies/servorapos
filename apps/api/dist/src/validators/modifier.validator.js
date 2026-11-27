"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateModifierGroupSchema = exports.createModifierGroupSchema = exports.createModifierOptionSchema = void 0;
// apps/api/src/validators/modifier.validator.ts
const zod_1 = require("zod");
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
exports.createModifierOptionSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Option name is required').max(150),
    priceAdjustment: zod_1.z.coerce.number().min(0, 'Price adjustment must be zero or greater').default(0),
    linkedInventoryItemId: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().positive('Invalid inventory item reference').nullable()),
    linkedQuantity: zod_1.z.coerce.number().min(0, 'Linked quantity cannot be negative').default(0),
    linkedUnit: optionalTrimmed,
    isDefault: zod_1.z.boolean().default(false),
    isAvailable: zod_1.z.boolean().default(true),
});
const modifierGroupBaseSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Modifier group name must be at least 2 characters').max(120),
    description: optionalTrimmed,
    minSelections: zod_1.z.coerce.number().int().min(0, 'Minimum selections cannot be negative').default(0),
    maxSelections: zod_1.z.coerce.number().int().min(1, 'Maximum selections must be at least 1').default(1),
    isRequired: zod_1.z.boolean().default(false),
    options: zod_1.z.array(exports.createModifierOptionSchema).min(1, 'Provide at least one modifier option'),
});
exports.createModifierGroupSchema = modifierGroupBaseSchema.superRefine((data, ctx) => {
    if (data.minSelections > data.maxSelections) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['minSelections'],
            message: 'Minimum selections cannot exceed maximum selections.',
        });
    }
    if (data.isRequired && data.minSelections < 1) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['minSelections'],
            message: 'Required modifier groups must have at least 1 minimum selection.',
        });
    }
    data.options.forEach((opt, idx) => {
        if (opt.linkedInventoryItemId !== null && opt.linkedQuantity <= 0) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: ['options', idx, 'linkedQuantity'],
                message: `Option "${opt.name}" is linked to an inventory item and must have a quantity greater than zero.`,
            });
        }
    });
});
exports.updateModifierGroupSchema = modifierGroupBaseSchema.partial();
