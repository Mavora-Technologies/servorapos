// apps/api/src/validators/availability.validator.ts
import { z } from 'zod';

const optionalTrimmed = z
  .string()
  .trim()
  .max(150, 'Reason must be 150 characters or fewer')
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const availabilityQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
});

export const updateAvailabilitySchema = z.object({
  menuItemId: z.coerce.number().int().positive('Valid menu item ID is required'),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  is86ed: z.boolean(),
  reason: optionalTrimmed,
  remainingCount: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(0, 'Remaining count cannot be negative').nullable()
  ),
  autoResetTomorrow: z.boolean().optional().default(false),
});

export const bulkAvailabilityToggleSchema = z.object({
  menuItemIds: z
    .array(z.coerce.number().int().positive('Valid menu item ID is required'))
    .min(1, 'Select at least one menu item'),
  branchId: z.coerce.number().int().positive().nullable().optional(),
  is86ed: z.boolean(),
  reason: optionalTrimmed,
  autoResetTomorrow: z.boolean().optional().default(false),
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type BulkAvailabilityToggleInput = z.infer<typeof bulkAvailabilityToggleSchema>;