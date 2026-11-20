// apps/api/src/validators/modifier.validator.ts
import { z } from 'zod';

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const createModifierOptionSchema = z.object({
  name: z.string().trim().min(1, 'Option name is required').max(150),
  priceAdjustment: z.coerce.number().min(0, 'Price adjustment must be zero or greater').default(0),
  linkedInventoryItemId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive('Invalid inventory item reference').nullable()
  ),
  linkedQuantity: z.coerce.number().min(0, 'Linked quantity cannot be negative').default(0),
  linkedUnit: optionalTrimmed,
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

const modifierGroupBaseSchema = z.object({
  name: z.string().trim().min(2, 'Modifier group name must be at least 2 characters').max(120),
  description: optionalTrimmed,
  minSelections: z.coerce.number().int().min(0, 'Minimum selections cannot be negative').default(0),
  maxSelections: z.coerce.number().int().min(1, 'Maximum selections must be at least 1').default(1),
  isRequired: z.boolean().default(false),
  options: z.array(createModifierOptionSchema).min(1, 'Provide at least one modifier option'),
});

export const createModifierGroupSchema = modifierGroupBaseSchema.superRefine((data, ctx) => {
  if (data.minSelections > data.maxSelections) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minSelections'],
      message: 'Minimum selections cannot exceed maximum selections.',
    });
  }
  if (data.isRequired && data.minSelections < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['minSelections'],
      message: 'Required modifier groups must have at least 1 minimum selection.',
    });
  }
  data.options.forEach((opt, idx) => {
    if (opt.linkedInventoryItemId !== null && opt.linkedQuantity <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options', idx, 'linkedQuantity'],
        message: `Option "${opt.name}" is linked to an inventory item and must have a quantity greater than zero.`,
      });
    }
  });
});

export const updateModifierGroupSchema = modifierGroupBaseSchema.partial();

export type CreateModifierOptionInput = z.infer<typeof createModifierOptionSchema>;
export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;
export type UpdateModifierGroupInput = z.infer<typeof updateModifierGroupSchema>;