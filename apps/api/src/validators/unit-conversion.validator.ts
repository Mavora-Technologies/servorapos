// apps/api/src/validators/unit-conversion.validator.ts
import { z } from 'zod';

export const UNIT_CATEGORIES = ['WEIGHT', 'VOLUME', 'PACKAGING', 'CUSTOM'] as const;

const optionalTrimmed = z
  .string()
  .trim()
  .max(255, 'Description must be 255 characters or fewer')
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

const unitConversionBaseSchema = z.object({
  fromUnit: z.string().trim().min(1, 'Source unit is required').max(50),
  toUnit: z.string().trim().min(1, 'Base ledger unit is required').max(50),
  conversionFactor: z.coerce
    .number()
    .positive('Conversion factor must be greater than zero'),
  inventoryItemId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive('Invalid inventory item reference').nullable()
  ),
  unitCategory: z.enum(UNIT_CATEGORIES).default('PACKAGING'),
  description: optionalTrimmed,
  isDefault: z.boolean().default(false),
});

export const createUnitConversionSchema = unitConversionBaseSchema.superRefine((data, ctx) => {
  if (data.fromUnit.toLowerCase() === data.toUnit.toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['toUnit'],
      message: 'Source unit and base ledger unit cannot be identical.',
    });
  }
});

// Zod v4 safe: .partial() applied on unrefined base schema
export const updateUnitConversionSchema = unitConversionBaseSchema.partial();

export type CreateUnitConversionInput = z.infer<typeof createUnitConversionSchema>;
export type UpdateUnitConversionInput = z.infer<typeof updateUnitConversionSchema>;