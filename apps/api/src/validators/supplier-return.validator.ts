import { z } from 'zod';

export const createSupplierReturnItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  quantity: z.coerce.number().positive('Return quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0, 'Unit cost must be non-negative'),
  reason: z.enum([
    'DEFECTIVE_SPOILED',
    'WRONG_ITEM',
    'BROKEN_PACKAGING',
    'TEMPERATURE_ABUSE',
    'OVER_DELIVERY',
  ]),
  notes: z.string().optional().nullable(),
});

export const createSupplierReturnSchema = z.object({
  supplierId: z.coerce.number().positive('Supplier selection is required'),
  goodsReceivedNoteId: z.coerce.number().positive().optional().nullable(),
  supplierInvoiceId: z.coerce.number().positive().optional().nullable(),
  debitNoteNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(createSupplierReturnItemSchema).min(1, 'At least one item must be returned'),
});

export const updateSupplierReturnStatusSchema = z.object({
  status: z.enum(['PENDING_DISPATCH', 'DISPATCHED', 'CREDITED', 'REJECTED']),
  debitNoteNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSupplierReturnInput = z.infer<typeof createSupplierReturnSchema>;