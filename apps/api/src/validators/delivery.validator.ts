import { z } from 'zod';

export const listDeliveriesQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  provider: z.string().trim().optional(),
  paymentStatus: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export const dispatchDeliverySchema = z.object({
  dispatchMode: z.enum(['IN_HOUSE', '3PL']).default('3PL'),
  provider: z.string().trim().min(2, 'Carrier or fleet name is required').max(100),
  driverName: z.string().trim().max(120).optional().nullable(),
  driverPhone: z.string().trim().max(40).optional().nullable(),
  vehicleRegistration: z.string().trim().max(40).optional().nullable(),
  trackingUrl: z.string().url('Tracking URL must be valid').optional().nullable().or(z.literal('')),
  deliveryFee: z.coerce.number().min(0).default(0),
  deliveryAddress: z.string().trim().max(300).optional().nullable(),
  deliveryNotes: z.string().trim().max(500).optional().nullable(),
});

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;
export type DispatchDeliveryInput = z.infer<typeof dispatchDeliverySchema>;