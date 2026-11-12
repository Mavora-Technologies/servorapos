import { z } from 'zod';

export const listOrdersQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  status: z.string().trim().optional(),
  paymentStatus: z.string().trim().optional(),
  orderType: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  cashierId: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD').optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  hasKraPin: z.enum(['true', 'false']).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'Confirmed',
    'Sent-To-Kitchen',
    'Preparing',
    'Ready',
    'Served',
    'Completed',
    'Delivered',
    'Cancelled',
  ]),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;