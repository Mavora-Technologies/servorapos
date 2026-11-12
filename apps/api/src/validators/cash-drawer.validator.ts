import { z } from 'zod';

export const openDrawerSessionSchema = z.object({
  drawerId: z.coerce.number().int().positive('Drawer ID is required'),
  cashierId: z.coerce.number().int().positive().optional(), // Supports supervisor proxy opening for a specific cashier
  openingFloat: z.coerce.number().min(0, 'Opening float cannot be negative'),
  notes: z.string().max(500).optional().nullable(),
});

export const closeDrawerSessionSchema = z.object({
  actualClosingBalance: z.coerce.number().min(0, 'Actual closing count is required'),
  denominations: z.record(z.string(), z.coerce.number().min(0)).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const cashDropSchema = z.object({
  sessionId: z.coerce.number().int().positive('Session ID is required'),
  amount: z.coerce.number().positive('Cash drop amount must be greater than zero'),
  reason: z.string().min(2, 'Cash drop reason is required').max(300).trim(),
});

export const createCashDrawerSchema = z.object({
  drawerCode: z.string().min(2, 'Drawer code/number is required').max(50).trim(),
  name: z.string().min(2, 'Terminal name is required').max(100).trim(),
  branchId: z.coerce.number().int().positive().optional().nullable(),
});

export type OpenDrawerSessionInput = z.infer<typeof openDrawerSessionSchema>;
export type CloseDrawerSessionInput = z.infer<typeof closeDrawerSessionSchema>;
export type CashDropInput = z.infer<typeof cashDropSchema>;
export type CreateCashDrawerInput = z.infer<typeof createCashDrawerSchema>;