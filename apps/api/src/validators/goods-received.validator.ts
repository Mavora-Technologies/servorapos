import { z } from 'zod';

export const receivePOItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive(),
  quantityAccepted: z.coerce.number().min(0, 'Accepted quantity cannot be negative'),
  quantityRejected: z.coerce.number().min(0).default(0),
  unitCost: z.coerce.number().min(0),
  rejectionReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createGoodsReceivedSchema = z.object({
  purchaseOrderId: z.coerce.number().positive('Purchase Order ID is required'),
  supplierDeliveryNote: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(receivePOItemSchema).min(1, 'At least one line item must be received'),
});

export type CreateGoodsReceivedInput = z.infer<typeof createGoodsReceivedSchema>;