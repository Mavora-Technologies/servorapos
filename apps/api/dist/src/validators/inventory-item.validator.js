"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInventoryItemMasterSchema = exports.createInventoryItemMasterSchema = void 0;
const zod_1 = require("zod");
exports.createInventoryItemMasterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Item title must be at least 2 characters').trim(),
    sku: zod_1.z.string().optional().nullable(),
    barcode: zod_1.z.string().optional().nullable(),
    materialType: zod_1.z.enum(['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'CONSUMABLE']).default('RAW_MATERIAL'),
    category: zod_1.z.string().min(2, 'Category is required'),
    unit: zod_1.z.string().min(1, 'Base unit of measure is required'),
    purchaseUnit: zod_1.z.string().optional().nullable(),
    conversionFactor: zod_1.z.coerce.number().positive('Multiplier must be greater than zero').default(1.0),
    preferredSupplierId: zod_1.z.coerce.number().positive().optional().nullable(),
    costPrice: zod_1.z.coerce.number().min(0, 'Cost price must be non-negative'),
    valuationMethod: zod_1.z.enum(['FIFO', 'AVCO', 'STANDARD']).default('FIFO'),
    minThreshold: zod_1.z.coerce.number().min(0).default(0),
    reorderQuantity: zod_1.z.coerce.number().min(0).default(0),
    currentStock: zod_1.z.coerce.number().min(0).default(0),
    trackingMethod: zod_1.z.enum(['BATCH_EXPIRY', 'SERIALIZED', 'NONE']).default('BATCH_EXPIRY'),
    storageCondition: zod_1.z.enum(['DRY_AMBIENT', 'CHILLED_2_8C', 'DEEP_FREEZE', 'WARM_HEATED']).default('DRY_AMBIENT'),
    taxClassification: zod_1.z.enum(['A_16', 'B_ZERO', 'E_EXEMPT']).default('A_16'),
    allowNegativeStock: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateInventoryItemMasterSchema = exports.createInventoryItemMasterSchema.partial();
