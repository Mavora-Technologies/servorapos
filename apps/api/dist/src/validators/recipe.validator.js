"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertRecipeSchema = exports.recipeIngredientItemSchema = void 0;
// apps/api/src/validators/recipe.validator.ts
const zod_1 = require("zod");
exports.recipeIngredientItemSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().positive('Inventory item reference is required'),
    ingredientName: zod_1.z.string().optional(),
    quantity: zod_1.z.coerce.number().positive('Quantity must be greater than 0'),
    unit: zod_1.z.string().min(1, 'Unit of measure is required'),
    wastagePercentage: zod_1.z.coerce.number().min(0).max(100).default(0),
    unitCost: zod_1.z.coerce.number().min(0).optional().default(0),
});
exports.upsertRecipeSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().positive('Menu item is required'),
    prepTimeMinutes: zod_1.z.coerce.number().int().min(0).default(10),
    cookTimeMinutes: zod_1.z.coerce.number().int().min(0).default(15),
    yieldPortions: zod_1.z.coerce.number().min(0.01).default(1),
    instructions: zod_1.z.string().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
    ingredients: zod_1.z.array(exports.recipeIngredientItemSchema).min(1, 'At least one ingredient is required'),
});
