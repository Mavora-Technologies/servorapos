import { z } from 'zod';

export const createManualMovementSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  type: z.enum([
    'GOODS_RECEIPT_PO',
    'WASTE_SCRAP',
    'PHYSICAL_INVENTORY_ADJ',
    'TRANSFER',
  ]),
  quantityDelta: z.coerce.number().refine((val) => val !== 0, 'Quantity delta cannot be zero'),
  unitCost: z.coerce.number().min(0).optional(),
  batchNumber: z.string().optional().nullable(),
  locationBin: z.string().optional().nullable(),
  documentReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const reverseMovementSchema = z.object({
  reason: z.string().min(3, 'Reversal reason is required'),
});

export type CreateManualMovementInput = z.infer<typeof createManualMovementSchema>;