import { z } from 'zod';

export const createPOItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  quantityOrdered: z.coerce.number().positive('Quantity ordered must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  taxRate: z.coerce.number().min(0).default(16.0),
  notes: z.string().optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.coerce.number().positive('Supplier selection is required'),
  branchId: z.coerce.number().positive().optional().nullable(),
  paymentTerms: z.enum(['COD', 'NET_7', 'NET_14', 'NET_30', 'PREPAID']).default('NET_30'),
  deliveryExpectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(createPOItemSchema).min(1, 'Purchase order must have at least one line item'),
});

export const updatePOStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'CANCELLED']),
  notes: z.string().optional().nullable(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;