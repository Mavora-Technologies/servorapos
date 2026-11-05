// apps/api/src/validators/unit-conversion.validator.ts
import { z } from 'zod';

export const createUnitConversionSchema = z.object({
  fromUnit: z.string().min(1, 'Source unit is required').trim(),
  toUnit: z.string().min(1, 'Target base unit is required').trim(),
  conversionFactor: z.coerce.number().positive('Conversion factor must be greater than 0'),
  inventoryItemId: z.coerce.number().positive().optional().nullable(),
  unitCategory: z.enum(['WEIGHT', 'VOLUME', 'PACKAGING', 'CUSTOM']).default('PACKAGING'),
  description: z.string().optional().nullable(),
});

export const updateUnitConversionSchema = createUnitConversionSchema.partial();

export type CreateUnitConversionInput = z.infer<typeof createUnitConversionSchema>;