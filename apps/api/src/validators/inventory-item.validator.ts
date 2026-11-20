// apps/api/src/validators/inventory-item.validator.ts
import { z } from 'zod';

export const MATERIAL_TYPES = [
  'RAW_MATERIAL',
  'SEMI_FINISHED',
  'FINISHED_GOOD',
  'CONSUMABLE',
] as const;

export const VALUATION_METHODS = ['FIFO', 'AVCO', 'STANDARD'] as const;
export const TRACKING_METHODS = ['BATCH_EXPIRY', 'SERIALIZED', 'NONE'] as const;
export const STORAGE_CONDITIONS = [
  'DRY_AMBIENT',
  'CHILLED_2_8C',
  'DEEP_FREEZE',
  'WARM_HEATED',
] as const;
export const TAX_CLASSIFICATIONS = ['A_16', 'B_ZERO', 'E_EXEMPT'] as const;

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const createInventoryItemMasterSchema = z.object({
  name: z.string().trim().min(2, 'Item title must be at least 2 characters'),
  sku: optionalTrimmedString,
  barcode: optionalTrimmedString,
  materialType: z.enum(MATERIAL_TYPES).default('RAW_MATERIAL'),
  category: z.string().trim().min(2, 'Category is required'),
  unit: z.string().trim().min(1, 'Base unit of measure is required'),
  purchaseUnit: optionalTrimmedString,
  conversionFactor: z.coerce
    .number()
    .positive('Conversion multiplier must be greater than zero')
    .default(1),
  preferredSupplierId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive('Invalid supplier reference').nullable()
  ),
  costPrice: z.coerce.number().min(0, 'Standard cost must be non-negative'),
  valuationMethod: z.enum(VALUATION_METHODS).default('FIFO'),
  minThreshold: z.coerce.number().min(0, 'Safety threshold must be non-negative').default(0),
  reorderQuantity: z.coerce.number().min(0, 'Reorder quantity must be non-negative').default(0),
  currentStock: z.coerce.number().min(0, 'Opening stock cannot be negative').default(0),
  trackingMethod: z.enum(TRACKING_METHODS).default('BATCH_EXPIRY'),
  storageCondition: z.enum(STORAGE_CONDITIONS).default('DRY_AMBIENT'),
  taxClassification: z.enum(TAX_CLASSIFICATIONS).default('A_16'),
  allowNegativeStock: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// Prohibit direct currentStock mutation through master-data updates; stock changes must post via ledger movements
export const updateInventoryItemMasterSchema = createInventoryItemMasterSchema
  .omit({ currentStock: true })
  .partial();

export type CreateInventoryItemMasterInput = z.infer<typeof createInventoryItemMasterSchema>;
export type UpdateInventoryItemMasterInput = z.infer<typeof updateInventoryItemMasterSchema>;