// apps/api/src/validators/recipe.validator.ts
import { z } from 'zod';

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const recipeIngredientItemSchema = z.object({
  inventoryItemId: z.coerce.number().int().positive('Valid raw material reference is required'),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit: z.string().trim().min(1, 'Unit of measure is required').max(50),
  wastagePercentage: z.coerce
    .number()
    .min(0, 'Wastage % cannot be negative')
    .max(100, 'Wastage % cannot exceed 100%')
    .default(0),
});

export const upsertRecipeSchema = z.object({
  menuItemId: z.coerce.number().int().positive('Valid menu item is required'),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  prepTimeMinutes: z.coerce.number().int().min(0, 'Prep time cannot be negative').default(10),
  cookTimeMinutes: z.coerce.number().int().min(0, 'Cook time cannot be negative').default(15),
  yieldPortions: z.coerce
    .number()
    .positive('Yield portions must be greater than zero')
    .default(1),
  instructions: optionalTrimmed,
  notes: optionalTrimmed,
  ingredients: z
    .array(recipeIngredientItemSchema)
    .min(1, 'Attach at least one raw material from inventory'),
});

export type RecipeIngredientItemInput = z.infer<typeof recipeIngredientItemSchema>;
export type UpsertRecipeInput = z.infer<typeof upsertRecipeSchema>;