// apps/api/src/validators/cashier-assignment.validator.ts
import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalPositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().optional());

const optionalNullableNote = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const listCashierAssignmentsQuerySchema = z.object({
  startDate: z.string().regex(dateRegex, 'startDate must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(dateRegex, 'endDate must be YYYY-MM-DD').optional(),
  branchId: optionalPositiveInt,
  userId: optionalPositiveInt,
  status: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
});

export const assignmentContextQuerySchema = z.object({
  branchId: optionalPositiveInt,
});

export const createCashierAssignmentSchema = z.object({
  branchId: z.coerce.number().int().positive('Operating branch is required'),
  cashDrawerId: z.coerce.number().int().positive('Target cash drawer register is required'),
  userId: z.coerce.number().int().positive('Designated cashier/custodian is required'),
  assignmentDate: z
    .string()
    .regex(dateRegex, 'Valid assignment date required (YYYY-MM-DD)'),
  shiftType: z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
  allocatedFloat: z.coerce.number().min(0, 'Opening float cannot be negative').default(0),
  maxCashLimit: z.coerce
    .number()
    .min(1000, 'Threshold cash limit must be at least 1,000')
    .default(50000),
  allowRefunds: z.boolean().default(false),
  allowDrawerPop: z.boolean().default(true),
  allowManualDiscount: z.boolean().default(false),
  maxDiscountPercent: z.coerce.number().int().min(0).max(100).default(0),
  handoverNotes: optionalNullableNote,
});

export const updateCashierAssignmentSchema = z.object({
  status: z.enum(['ASSIGNED', 'ACTIVE', 'RELEASED', 'REVOKED']).optional(),
  allocatedFloat: z.coerce.number().min(0).optional(),
  maxCashLimit: z.coerce.number().min(1000).optional(),
  allowRefunds: z.boolean().optional(),
  allowDrawerPop: z.boolean().optional(),
  allowManualDiscount: z.boolean().optional(),
  maxDiscountPercent: z.coerce.number().int().min(0).max(100).optional(),
  handoverNotes: optionalNullableNote,
});

export const revokeAssignmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Mandatory revocation reason (min 3 characters) is required for compliance')
    .max(500),
});

export type ListCashierAssignmentsQuery = z.infer<typeof listCashierAssignmentsQuerySchema>;
export type AssignmentContextQuery = z.infer<typeof assignmentContextQuerySchema>;
export type CreateCashierAssignmentInput = z.infer<typeof createCashierAssignmentSchema>;
export type UpdateCashierAssignmentInput = z.infer<typeof updateCashierAssignmentSchema>;
export type RevokeAssignmentInput = z.infer<typeof revokeAssignmentSchema>;