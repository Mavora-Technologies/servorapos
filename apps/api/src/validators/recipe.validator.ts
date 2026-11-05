// apps/api/src/validators/recipe.validator.ts
import { z } from 'zod';

export const recipeIngredientItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item reference is required'),
  ingredientName: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit of measure is required'),
  wastagePercentage: z.coerce.number().min(0).max(100).default(0),
  unitCost: z.coerce.number().min(0).optional().default(0),
});

export const upsertRecipeSchema = z.object({
  menuItemId: z.coerce.number().positive('Menu item is required'),
  prepTimeMinutes: z.coerce.number().int().min(0).default(10),
  cookTimeMinutes: z.coerce.number().int().min(0).default(15),
  yieldPortions: z.coerce.number().min(0.01).default(1),
  instructions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  ingredients: z.array(recipeIngredientItemSchema).min(1, 'At least one ingredient is required'),
});

export type UpsertRecipeInput = z.infer<typeof upsertRecipeSchema>;