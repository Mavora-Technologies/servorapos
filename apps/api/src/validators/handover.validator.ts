import { z } from 'zod';

export const createHandoverSchema = z.object({
  branchId: z.coerce.number().positive('Operating branch is required'),
  shiftType: z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']),
  handoverDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid handover date required (YYYY-MM-DD)'),
  incomingManagerId: z.coerce.number().positive().optional().nullable(),
  openingFloat: z.coerce.number().min(0).default(0),
  closingCash: z.coerce.number().min(0).default(0),
  cashVariance: z.coerce.number().default(0),
  cashStatus: z.enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER']).default('BALANCED'),
  operationalIncidents: z.string().optional().nullable(),
  inventoryKitchenNotes: z.string().optional().nullable(),
  hardwareMaintenanceNotes: z.string().optional().nullable(),
  guestExperienceNotes: z.string().optional().nullable(),
  checklistItems: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1),
        completed: z.boolean(),
      })
    )
    .default([]),
  status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
});

export const updateHandoverSchema = z.object({
  incomingManagerId: z.coerce.number().positive().optional().nullable(),
  openingFloat: z.coerce.number().min(0).optional(),
  closingCash: z.coerce.number().min(0).optional(),
  cashVariance: z.coerce.number().optional(),
  cashStatus: z.enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER']).optional(),
  operationalIncidents: z.string().optional().nullable(),
  inventoryKitchenNotes: z.string().optional().nullable(),
  hardwareMaintenanceNotes: z.string().optional().nullable(),
  guestExperienceNotes: z.string().optional().nullable(),
  checklistItems: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        completed: z.boolean(),
      })
    )
    .optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']).optional(),
});

export const acknowledgeHandoverSchema = z.object({
  notes: z.string().optional(),
});

export type CreateHandoverInput = z.infer<typeof createHandoverSchema>;
export type UpdateHandoverInput = z.infer<typeof updateHandoverSchema>;
export type AcknowledgeHandoverInput = z.infer<typeof acknowledgeHandoverSchema>;