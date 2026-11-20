// apps/api/src/validators/combo.validator.ts
import { z } from 'zod';

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const createComboItemSchema = z.object({
  menuItemId: z.coerce.number().int().positive('Valid menu item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  additionalPrice: z.coerce.number().min(0, 'Additional price cannot be negative').default(0),
});

const comboBundleBaseSchema = z.object({
  name: z.string().trim().min(2, 'Combo bundle name must be at least 2 characters').max(150),
  description: optionalTrimmed,
  sku: optionalTrimmed,
  basePrice: z.coerce.number().min(0, 'Base price must be zero or greater'),
  isAvailable: z.boolean().default(true),
  items: z
    .array(createComboItemSchema)
    .min(1, 'Please attach at least one dish or drink to the combo'),
});

export const createComboBundleSchema = comboBundleBaseSchema;
export const updateComboBundleSchema = comboBundleBaseSchema.partial();

export type CreateComboItemInput = z.infer<typeof createComboItemSchema>;
export type CreateComboBundleInput = z.infer<typeof createComboBundleSchema>;
export type UpdateComboBundleInput = z.infer<typeof updateComboBundleSchema>;