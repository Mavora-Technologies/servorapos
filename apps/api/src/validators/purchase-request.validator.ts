import { z } from 'zod';

export const createPRItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  requestedQuantity: z.coerce.number().positive('Requested quantity must be greater than zero'),
  notes: z.string().optional().nullable(),
});

export const createPurchaseRequestSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  department: z.enum(['KITCHEN', 'BAR', 'PASTRY', 'FLOOR', 'MAINTENANCE']).default('KITCHEN'),
  priority: z.enum(['LOW', 'NORMAL', 'URGENT']).default('NORMAL'),
  notes: z.string().optional().nullable(),
  items: z.array(createPRItemSchema).min(1, 'At least one item is required in the request'),
});

export const reviewPurchaseRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;