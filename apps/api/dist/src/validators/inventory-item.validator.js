"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateInventoryItemMasterSchema = exports.createInventoryItemMasterSchema = exports.TAX_CLASSIFICATIONS = exports.STORAGE_CONDITIONS = exports.TRACKING_METHODS = exports.VALUATION_METHODS = exports.MATERIAL_TYPES = void 0;
// apps/api/src/validators/inventory-item.validator.ts
const zod_1 = require("zod");
exports.MATERIAL_TYPES = [
    'RAW_MATERIAL',
    'SEMI_FINISHED',
    'FINISHED_GOOD',
    'CONSUMABLE',
];
exports.VALUATION_METHODS = ['FIFO', 'AVCO', 'STANDARD'];
exports.TRACKING_METHODS = ['BATCH_EXPIRY', 'SERIALIZED', 'NONE'];
exports.STORAGE_CONDITIONS = [
    'DRY_AMBIENT',
    'CHILLED_2_8C',
    'DEEP_FREEZE',
    'WARM_HEATED',
];
exports.TAX_CLASSIFICATIONS = ['A_16', 'B_ZERO', 'E_EXEMPT'];
const optionalTrimmedString = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
exports.createInventoryItemMasterSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Item title must be at least 2 characters'),
    sku: optionalTrimmedString,
    barcode: optionalTrimmedString,
    materialType: zod_1.z.enum(exports.MATERIAL_TYPES).default('RAW_MATERIAL'),
    category: zod_1.z.string().trim().min(2, 'Category is required'),
    unit: zod_1.z.string().trim().min(1, 'Base unit of measure is required'),
    purchaseUnit: optionalTrimmedString,
    conversionFactor: zod_1.z.coerce
        .number()
        .positive('Conversion multiplier must be greater than zero')
        .default(1),
    preferredSupplierId: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().positive('Invalid supplier reference').nullable()),
    costPrice: zod_1.z.coerce.number().min(0, 'Standard cost must be non-negative'),
    valuationMethod: zod_1.z.enum(exports.VALUATION_METHODS).default('FIFO'),
    minThreshold: zod_1.z.coerce.number().min(0, 'Safety threshold must be non-negative').default(0),
    reorderQuantity: zod_1.z.coerce.number().min(0, 'Reorder quantity must be non-negative').default(0),
    currentStock: zod_1.z.coerce.number().min(0, 'Opening stock cannot be negative').default(0),
    trackingMethod: zod_1.z.enum(exports.TRACKING_METHODS).default('BATCH_EXPIRY'),
    storageCondition: zod_1.z.enum(exports.STORAGE_CONDITIONS).default('DRY_AMBIENT'),
    taxClassification: zod_1.z.enum(exports.TAX_CLASSIFICATIONS).default('A_16'),
    allowNegativeStock: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
// Prohibit direct currentStock mutation through master-data updates; stock changes must post via ledger movements
exports.updateInventoryItemMasterSchema = exports.createInventoryItemMasterSchema
    .omit({ currentStock: true })
    .partial();
