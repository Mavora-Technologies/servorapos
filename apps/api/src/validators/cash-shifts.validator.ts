import { z } from 'zod';

export const openShiftSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  cashierId: z.coerce.number().int().positive().optional(), // Optional: defaults to authenticated user; managers can open for staff
  cashDrawerId: z.coerce.number().int().positive().optional(),
  shiftType: z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
  openingFloat: z.coerce.number().min(0, 'Opening float cannot be negative'),
  notes: z.string().max(500).optional(),
});

export const closeShiftSchema = z.object({
  shiftId: z.coerce.number().int().positive(),
  countedCash: z.coerce.number().min(0, 'Counted cash cannot be negative'),
  denominations: z.record(z.string(), z.number().min(0)).optional(),
  varianceNotes: z.string().max(500).optional(),
});

export const shiftCashMovementSchema = z.object({
  shiftId: z.coerce.number().int().positive(),
  movementType: z.enum(['SAFE_DROP', 'PETTY_CASH_PAYOUT']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  reason: z.string().min(2, 'Audit reason is required').max(300),
});

export const listShiftsQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  cashierId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'OPEN', 'CLOSED']).default('ALL'),
  search: z.string().trim().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type ShiftCashMovementInput = z.infer<typeof shiftCashMovementSchema>;
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;