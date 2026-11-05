import { z } from 'zod';

export const createWasteLogSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  inventoryBatchId: z.coerce.number().positive().optional().nullable(),
  department: z.enum(['KITCHEN', 'BAR', 'BAKERY', 'BUTCHERY', 'MAIN_STORE', 'FLOOR']).default('KITCHEN'),
  wasteReason: z.enum([
    'EXPIRED',
    'SPOILED_STORAGE',
    'OVERCOOKED_BURNED',
    'DROPPED_DAMAGED',
    'PREP_ERROR',
    'OVER_PORTIONED',
    'EQUIPMENT_FAILURE',
  ]),
  dispositionMethod: z.enum(['TRASH_LANDFILL', 'COMPOST_ORGANIC', 'STAFF_FEEDING', 'SUPPLIER_CLAIM']).default('TRASH_LANDFILL'),
  quantity: z.coerce.number().positive('Waste quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0).optional(),
  locationBin: z.string().trim().optional().nullable(),
  witnessName: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
  loggedAt: z.string().optional(),
});

export type CreateWasteLogInput = z.infer<typeof createWasteLogSchema>;