// apps/api/src/validators/pos-terminal.validator.ts
import { z } from 'zod';

export const posBootstrapQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
});

export const posCustomerSearchQuerySchema = z.object({
  search: z.string().trim().min(1, 'Search query is required'),
});

export const posValidatePromoSchema = z.object({
  code: z.string().trim().min(2).max(50),
  subtotalKes: z.coerce.number().min(0),
});

export const posValidateStockSchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.coerce.number().int().positive('Valid menu item ID is required'),
        quantity: z.coerce.number().positive('Quantity must be greater than zero'),
      })
    )
    .min(1, 'At least one order item is required for stock validation'),
});

export const posPinSwitchSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
  branchId: z.coerce.number().int().positive('Active branch ID is required'),
  userId: z.coerce.number().int().positive().optional(), // Optional: speeds up lookup when avatar tile is tapped
});

export const assignStaffPosPinSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
});

export type PosBootstrapQuery = z.infer<typeof posBootstrapQuerySchema>;
export type PosCustomerSearchQuery = z.infer<typeof posCustomerSearchQuerySchema>;
export type PosValidatePromoInput = z.infer<typeof posValidatePromoSchema>;
export type PosValidateStockInput = z.infer<typeof posValidateStockSchema>;
export type PosPinSwitchInput = z.infer<typeof posPinSwitchSchema>;
export type AssignStaffPosPinInput = z.infer<typeof assignStaffPosPinSchema>;