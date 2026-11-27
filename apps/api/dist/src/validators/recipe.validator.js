"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertRecipeSchema = exports.recipeIngredientItemSchema = void 0;
// apps/api/src/validators/recipe.validator.ts
const zod_1 = require("zod");
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
exports.recipeIngredientItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().int().positive('Valid raw material reference is required'),
    quantity: zod_1.z.coerce.number().positive('Quantity must be greater than zero'),
    unit: zod_1.z.string().trim().min(1, 'Unit of measure is required').max(50),
    wastagePercentage: zod_1.z.coerce
        .number()
        .min(0, 'Wastage % cannot be negative')
        .max(100, 'Wastage % cannot exceed 100%')
        .default(0),
});
exports.upsertRecipeSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().int().positive('Valid menu item is required'),
    branchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
    prepTimeMinutes: zod_1.z.coerce.number().int().min(0, 'Prep time cannot be negative').default(10),
    cookTimeMinutes: zod_1.z.coerce.number().int().min(0, 'Cook time cannot be negative').default(15),
    yieldPortions: zod_1.z.coerce
        .number()
        .positive('Yield portions must be greater than zero')
        .default(1),
    instructions: optionalTrimmed,
    notes: optionalTrimmed,
    ingredients: zod_1.z
        .array(exports.recipeIngredientItemSchema)
        .min(1, 'Attach at least one raw material from inventory'),
});
