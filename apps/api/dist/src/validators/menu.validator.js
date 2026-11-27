"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMenuItemSchema = exports.createMenuItemSchema = exports.deleteMenuImageSchema = exports.signMenuImageUploadSchema = exports.recipeIngredientInputSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.KITCHEN_STATIONS = exports.STOCK_TRACKING_TYPES = void 0;
// apps/api/src/validators/menu.validator.ts
const zod_1 = require("zod");
const cloudinary_1 = require("../utils/cloudinary");
exports.STOCK_TRACKING_TYPES = [
    'RECIPE',
    'STOCKED_PRODUCT',
    'COMPOSITE',
    'NON_TRACKED',
];
exports.KITCHEN_STATIONS = [
    'MAIN_KITCHEN',
    'GRILL',
    'BAR',
    'PASTRY',
    'COLD_PANTRY',
    'PACKING',
];
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
const categoryBaseSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Category name must be at least 2 characters').max(120),
    description: optionalTrimmed,
    sortOrder: zod_1.z.coerce.number().int().min(0).default(0),
    isActive: zod_1.z.boolean().default(true),
    branchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
});
exports.createCategorySchema = categoryBaseSchema;
exports.updateCategorySchema = categoryBaseSchema.partial();
exports.recipeIngredientInputSchema = zod_1.z.object({
    inventoryItemId: zod_1.z.coerce.number().int().positive('Valid raw material is required'),
    quantity: zod_1.z.coerce.number().positive('Ingredient quantity must be greater than zero'),
    unit: zod_1.z.string().trim().min(1, 'Unit of measure is required'),
    wastagePercentage: zod_1.z.coerce.number().min(0).max(100).default(0),
});
exports.signMenuImageUploadSchema = zod_1.z.object({
    fileName: zod_1.z.string().trim().min(1, 'File name is required').max(255),
    mimeType: zod_1.z.enum(cloudinary_1.ALLOWED_IMAGE_MIME_TYPES, {
        message: 'Unsupported image format. Only JPEG, PNG, and WebP are allowed.',
    }),
    fileSize: zod_1.z.coerce
        .number()
        .int()
        .positive('File size must be greater than zero')
        .max(cloudinary_1.MAX_MENU_IMAGE_BYTES, 'Image exceeds the 5 MB maximum upload limit.'),
});
exports.deleteMenuImageSchema = zod_1.z.object({
    publicId: zod_1.z.string().trim().min(3, 'Cloudinary publicId is required').max(255),
});
const menuItemBaseSchema = zod_1.z.object({
    categoryId: zod_1.z.coerce.number().int().positive('Valid category is required'),
    branchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
    name: zod_1.z.string().trim().min(2, 'Item name must be at least 2 characters'),
    sku: optionalTrimmed,
    description: optionalTrimmed,
    price: zod_1.z.coerce.number().positive('Selling price must be greater than zero'),
    costEstimate: zod_1.z.coerce.number().min(0).optional(),
    stockTrackingType: zod_1.z.enum(exports.STOCK_TRACKING_TYPES).default('RECIPE'),
    directInventoryItemId: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().positive('Invalid linked inventory item').nullable()),
    recipeIngredients: zod_1.z.array(exports.recipeIngredientInputSchema).optional(),
    modifierGroupIds: zod_1.z.array(zod_1.z.coerce.number().int().positive()).optional(),
    kitchenStation: zod_1.z.string().trim().min(2).default('MAIN_KITCHEN'),
    prepTimeMinutes: zod_1.z.coerce.number().int().min(0).default(15),
    taxRate: zod_1.z.coerce.number().min(0).max(100).default(16),
    cateringLevyRate: zod_1.z.coerce.number().min(0).max(100).default(2),
    isTaxInclusive: zod_1.z.boolean().default(true),
    isAvailable: zod_1.z.boolean().default(true),
    imageUrl: zod_1.z
        .string()
        .trim()
        .transform((val) => (val === '' ? null : val))
        .nullable()
        .optional()
        .refine((val) => !val || /^https?:\/\//i.test(val) || val.startsWith('/'), {
        message: 'Image URL must be a valid URL or relative path',
    }),
    imagePublicId: optionalTrimmed,
    imageOriginalFilename: optionalTrimmed,
    imageMimeType: optionalTrimmed,
    imageFileSize: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().nonnegative().max(cloudinary_1.MAX_MENU_IMAGE_BYTES).nullable().optional()),
});
exports.createMenuItemSchema = menuItemBaseSchema.superRefine((data, ctx) => {
    if (data.stockTrackingType === 'STOCKED_PRODUCT' && !data.directInventoryItemId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['directInventoryItemId'],
            message: 'Select a stocked inventory product when tracking type is STOCKED_PRODUCT.',
        });
    }
});
exports.updateMenuItemSchema = menuItemBaseSchema.partial();
