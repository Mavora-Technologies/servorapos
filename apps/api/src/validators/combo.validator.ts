// apps/api/src/validators/combo.validator.ts
import { z } from 'zod';

export const createComboItemSchema = z.object({
  menuItemId: z.coerce.number().positive('Menu item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  additionalPrice: z.coerce.number().min(0).default(0),
});

export const createComboBundleSchema = z.object({
  name: z.string().min(2, 'Combo bundle name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  basePrice: z.coerce.number().min(0, 'Base price must be a valid non-negative number'),
  isAvailable: z.boolean().optional().default(true),
  items: z.array(createComboItemSchema).min(1, 'Please attach at least one dish or drink to the combo'),
});

export type CreateComboBundleInput = z.infer<typeof createComboBundleSchema>;