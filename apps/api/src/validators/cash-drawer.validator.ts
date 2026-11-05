import { z } from 'zod';

export const openDrawerSessionSchema = z.object({
  drawerId: z.coerce.number().positive('Drawer ID is required'),
  openingFloat: z.coerce.number().min(0, 'Opening float cannot be negative'),
  notes: z.string().optional().nullable(),
});

export const closeDrawerSessionSchema = z.object({
  actualClosingBalance: z.coerce.number().min(0, 'Actual closing count is required'),
  denominations: z.record(z.string(), z.coerce.number()).optional(),
  notes: z.string().optional().nullable(),
});

export const cashDropSchema = z.object({
  sessionId: z.coerce.number().positive('Session ID is required'),
  amount: z.coerce.number().positive('Cash drop amount must be greater than zero'),
  reason: z.string().min(2, 'Cash drop reason is required').trim(),
});