// apps/api/src/validators/availability.validator.ts
import { z } from 'zod';

export const updateAvailabilitySchema = z.object({
  menuItemId: z.coerce.number().positive(),
  is86ed: z.boolean(),
  reason: z.string().optional().nullable(),
  remainingCount: z.coerce.number().int().min(0).optional().nullable(),
  autoResetTomorrow: z.boolean().optional(),
});

export const bulkAvailabilityToggleSchema = z.object({
  menuItemIds: z.array(z.coerce.number().positive()).min(1),
  is86ed: z.boolean(),
  reason: z.string().optional().nullable(),
});

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;