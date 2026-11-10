import { z } from 'zod';

export const openShiftSchema = z.object({
  branchId: z.coerce.number().int().positive('Branch ID is required'),
  cashDrawerId: z.coerce.number().int().positive().optional().nullable(),
  openingFloat: z.coerce.number().min(0, 'Opening float cannot be negative').default(0),
  shiftType: z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
});

export const closeShiftSchema = z.object({
  shiftId: z.coerce.number().int().positive('Shift ID is required'),
  countedCash: z.coerce.number().min(0, 'Counted cash cannot be negative'),
  denominations: z.record(z.string(), z.coerce.number().int().min(0)).optional().default({}),
  varianceNotes: z.string().trim().max(1000).optional().nullable(),
});

export const recordDropOrPayoutSchema = z.object({
  shiftId: z.coerce.number().int().positive('Shift ID is required'),
  type: z.enum(['SAFE_DROP', 'PETTY_CASH_PAYOUT']),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  reason: z.string().trim().min(3, 'Reason must be provided').max(255),
});

export const listShiftsQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  cashierId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'OPEN', 'CLOSED']).default('ALL'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type RecordDropOrPayoutInput = z.infer<typeof recordDropOrPayoutSchema>;
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;