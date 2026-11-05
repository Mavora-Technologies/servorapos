// apps/api/src/validators/modifier.validator.ts
import { z } from 'zod';

export const createModifierOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required'),
  priceAdjustment: z.coerce.number().min(0, 'Price adjustment must be 0 or higher').default(0),
  isDefault: z.boolean().optional().default(false),
  isAvailable: z.boolean().optional().default(true),
});

export const createModifierGroupSchema = z.object({
  name: z.string().min(2, 'Modifier group name is required'),
  description: z.string().optional(),
  minSelections: z.coerce.number().min(0).default(0),
  maxSelections: z.coerce.number().min(1).default(1),
  isRequired: z.boolean().optional().default(false),
  options: z.array(createModifierOptionSchema).min(1, 'Provide at least one option'),
});

export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;