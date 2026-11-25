// apps/api/src/validators/handover.validator.ts
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalPositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().optional());

const nullablePositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().nullable());

const optionalNullableText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const checklistItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  text: z.string().trim().min(1).max(255),
  completed: z.boolean(),
});

export const listHandoversQuerySchema = z.object({
  startDate: z.string().regex(dateRegex, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(dateRegex, 'endDate must be YYYY-MM-DD').optional(),
  branchId: optionalPositiveInt,
  shiftType: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
  status: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
});

export const handoverContextQuerySchema = z.object({
  branchId: z.coerce.number().int().positive('Operating branch is required'),
  date: z.string().regex(dateRegex, 'date must be YYYY-MM-DD').optional(),
});

export const createHandoverSchema = z
  .object({
    branchId: z.coerce.number().int().positive('Operating branch is required'),
    handoverScope: z.enum(['BRANCH_WIDE', 'TILL_CUSTODY']).default('BRANCH_WIDE'),
    cashierShiftId: nullablePositiveInt.default(null),
    cashDrawerId: nullablePositiveInt.default(null),
    shiftType: z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']),
    handoverDate: z.string().regex(dateRegex, 'Valid handover date required (YYYY-MM-DD)'),
    incomingManagerId: nullablePositiveInt.default(null),
    openingFloat: z.coerce.number().min(0, 'Opening float cannot be negative').default(0),
    closingCash: z.coerce.number().min(0, 'Closing cash cannot be negative').default(0),
    cashVariance: z.coerce.number().default(0),
    cashStatus: z
      .enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER'])
      .default('BALANCED'),
    operationalIncidents: optionalNullableText,
    inventoryKitchenNotes: optionalNullableText,
    hardwareMaintenanceNotes: optionalNullableText,
    guestExperienceNotes: optionalNullableText,
    checklistItems: z.array(checklistItemSchema).max(50).default([]),
    status: z.enum(['DRAFT', 'SUBMITTED']).default('SUBMITTED'),
  })
  .refine(
    (d) => d.handoverScope !== 'TILL_CUSTODY' || d.cashierShiftId !== null || d.cashDrawerId !== null,
    {
      message: 'Till custody handovers must specify a Cash Shift or Physical Cash Drawer.',
      path: ['cashierShiftId'],
    }
  );

export const updateHandoverSchema = z.object({
  incomingManagerId: nullablePositiveInt.optional(),
  cashierShiftId: nullablePositiveInt.optional(),
  cashDrawerId: nullablePositiveInt.optional(),
  openingFloat: z.coerce.number().min(0).optional(),
  closingCash: z.coerce.number().min(0).optional(),
  cashVariance: z.coerce.number().optional(),
  cashStatus: z.enum(['BALANCED', 'DISCREPANCY_SHORT', 'DISCREPANCY_OVER']).optional(),
  operationalIncidents: optionalNullableText,
  inventoryKitchenNotes: optionalNullableText,
  hardwareMaintenanceNotes: optionalNullableText,
  guestExperienceNotes: optionalNullableText,
  checklistItems: z.array(checklistItemSchema).max(50).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED']).optional(),
});

export const acknowledgeHandoverSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

export const disputeHandoverSchema = z.object({
  reason: z.string().trim().min(5, 'Dispute justification (min 5 characters) is required').max(500),
});

export const resolveDisputeSchema = z.object({
  resolutionNotes: z
    .string()
    .trim()
    .min(5, 'Audit resolution notes (min 5 characters) are required')
    .max(1000),
  postGlAdjustment: z.boolean().default(true),
});

export type ListHandoversQuery = z.infer<typeof listHandoversQuerySchema>;
export type HandoverContextQuery = z.infer<typeof handoverContextQuerySchema>;
export type CreateHandoverInput = z.infer<typeof createHandoverSchema>;
export type UpdateHandoverInput = z.infer<typeof updateHandoverSchema>;
export type AcknowledgeHandoverInput = z.infer<typeof acknowledgeHandoverSchema>;
export type DisputeHandoverInput = z.infer<typeof disputeHandoverSchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;