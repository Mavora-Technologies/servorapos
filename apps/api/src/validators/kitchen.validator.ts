import { z } from 'zod';

export const kitchenTicketsQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  station: z.string().trim().optional(),
  orderType: z.string().trim().optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['Confirmed', 'Preparing', 'Ready', 'Cancelled']),
});

export const updateKitchenItemStatusSchema = z.object({
  kitchenStatus: z.enum(['New', 'Preparing', 'Ready']),
});

export type KitchenTicketsQuery = z.infer<typeof kitchenTicketsQuerySchema>;