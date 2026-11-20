// apps/api/src/validators/menu.validator.ts
import { z } from 'zod';

export const STOCK_TRACKING_TYPES = [
  'RECIPE',
  'STOCKED_PRODUCT',
  'COMPOSITE',
  'NON_TRACKED',
] as const;

export const KITCHEN_STATIONS = [
  'MAIN_KITCHEN',
  'GRILL',
  'BAR',
  'PASTRY',
  'COLD_PANTRY',
  'PACKING',
] as const;

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

const categoryBaseSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(120),
  description: optionalTrimmed,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  branchId: z.coerce.number().int().positive().nullable().optional(),
});

export const createCategorySchema = categoryBaseSchema;
export const updateCategorySchema = categoryBaseSchema.partial();

export const recipeIngredientInputSchema = z.object({
  inventoryItemId: z.coerce.number().int().positive('Valid raw material is required'),
  quantity: z.coerce.number().positive('Ingredient quantity must be greater than zero'),
  unit: z.string().trim().min(1, 'Unit of measure is required'),
  wastagePercentage: z.coerce.number().min(0).max(100).default(0),
});

const menuItemBaseSchema = z.object({
  categoryId: z.coerce.number().int().positive('Valid category is required'),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters'),
  sku: optionalTrimmed,
  description: optionalTrimmed,
  price: z.coerce.number().positive('Selling price must be greater than zero'),
  costEstimate: z.coerce.number().min(0).optional(),
  stockTrackingType: z.enum(STOCK_TRACKING_TYPES).default('RECIPE'),
  directInventoryItemId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive('Invalid linked inventory item').nullable()
  ),
  recipeIngredients: z.array(recipeIngredientInputSchema).optional(),
  kitchenStation: z.string().trim().min(2).default('MAIN_KITCHEN'),
  prepTimeMinutes: z.coerce.number().int().min(0).default(15),
  taxRate: z.coerce.number().min(0).max(100).default(16),
  cateringLevyRate: z.coerce.number().min(0).max(100).default(2),
  isTaxInclusive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  imageUrl: z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine((val) => !val || /^https?:\/\//i.test(val) || val.startsWith('/'), {
      message: 'Image URL must be a valid URL or relative path',
    }),
});

export const createMenuItemSchema = menuItemBaseSchema.superRefine((data, ctx) => {
  if (data.stockTrackingType === 'STOCKED_PRODUCT' && !data.directInventoryItemId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['directInventoryItemId'],
      message: 'Select a stocked inventory product when tracking type is STOCKED_PRODUCT.',
    });
  }
});

export const updateMenuItemSchema = menuItemBaseSchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;