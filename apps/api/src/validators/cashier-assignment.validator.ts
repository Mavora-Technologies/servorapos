import { z } from 'zod';

export const createCashierAssignmentSchema = z.object({
  branchId: z.coerce.number().positive('Operating branch is required'),
  cashDrawerId: z.coerce.number().positive('Target cash drawer register is required'),
  userId: z.coerce.number().positive('Designated cashier/custodian is required'),
  assignmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid assignment date required (YYYY-MM-DD)'),
  shiftType: z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
  allocatedFloat: z.coerce.number().min(0, 'Opening float cannot be negative').default(5000),
  maxCashLimit: z.coerce.number().min(1000, 'Threshold cash limit must be at least 1,000').default(50000),
  allowRefunds: z.boolean().default(false),
  allowDrawerPop: z.boolean().default(true),
  allowManualDiscount: z.boolean().default(false),
  maxDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  handoverNotes: z.string().optional().nullable(),
});

export const updateCashierAssignmentSchema = z.object({
  status: z.enum(['ASSIGNED', 'ACTIVE', 'RELEASED', 'REVOKED']).optional(),
  allocatedFloat: z.coerce.number().min(0).optional(),
  maxCashLimit: z.coerce.number().min(1000).optional(),
  allowRefunds: z.boolean().optional(),
  allowDrawerPop: z.boolean().optional(),
  allowManualDiscount: z.boolean().optional(),
  maxDiscountPercent: z.coerce.number().min(0).max(100).optional(),
  handoverNotes: z.string().optional().nullable(),
});

export const revokeAssignmentSchema = z.object({
  reason: z.string().min(3, 'Mandatory revocation reason is required for compliance'),
});

export type CreateCashierAssignmentInput = z.infer<typeof createCashierAssignmentSchema>;
export type UpdateCashierAssignmentInput = z.infer<typeof updateCashierAssignmentSchema>;
export type RevokeAssignmentInput = z.infer<typeof revokeAssignmentSchema>;