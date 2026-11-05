import { z } from 'zod';

export const createInventoryItemMasterSchema = z.object({
  name: z.string().min(2, 'Item title must be at least 2 characters').trim(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  materialType: z.enum(['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'CONSUMABLE']).default('RAW_MATERIAL'),
  category: z.string().min(2, 'Category is required'),
  unit: z.string().min(1, 'Base unit of measure is required'),
  purchaseUnit: z.string().optional().nullable(),
  conversionFactor: z.coerce.number().positive('Multiplier must be greater than zero').default(1.0),
  preferredSupplierId: z.coerce.number().positive().optional().nullable(),
  costPrice: z.coerce.number().min(0, 'Cost price must be non-negative'),
  valuationMethod: z.enum(['FIFO', 'AVCO', 'STANDARD']).default('FIFO'),
  minThreshold: z.coerce.number().min(0).default(0),
  reorderQuantity: z.coerce.number().min(0).default(0),
  currentStock: z.coerce.number().min(0).default(0),
  trackingMethod: z.enum(['BATCH_EXPIRY', 'SERIALIZED', 'NONE']).default('BATCH_EXPIRY'),
  storageCondition: z.enum(['DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'WARM_HEATED']).default('DRY_AMBIENT'),
  taxClassification: z.enum(['A_16', 'B_ZERO', 'E_EXEMPT']).default('A_16'),
  allowNegativeStock: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateInventoryItemMasterSchema = createInventoryItemMasterSchema.partial();

export type CreateInventoryItemMasterInput = z.infer<typeof createInventoryItemMasterSchema>;