"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateComboBundleSchema = exports.createComboBundleSchema = exports.createComboItemSchema = void 0;
// apps/api/src/validators/combo.validator.ts
const zod_1 = require("zod");
const cloudinary_1 = require("../utils/cloudinary");
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
const optionalTimestamp = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
    message: 'Invalid date/time format',
});
exports.createComboItemSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().int().positive('Valid menu item is required'),
    quantity: zod_1.z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
    additionalPrice: zod_1.z.coerce.number().min(0, 'Additional price cannot be negative').default(0),
});
const comboBundleBaseSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Combo bundle name must be at least 2 characters').max(150),
    description: optionalTrimmed,
    sku: optionalTrimmed,
    branchId: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().int().positive().nullable().optional()),
    basePrice: zod_1.z.coerce.number().min(0, 'Base price must be zero or greater'),
    isAvailable: zod_1.z.boolean().default(true),
    validFrom: optionalTimestamp,
    validUntil: optionalTimestamp,
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
    items: zod_1.z
        .array(exports.createComboItemSchema)
        .min(1, 'Please attach at least one dish or drink to the combo'),
});
exports.createComboBundleSchema = comboBundleBaseSchema.refine((d) => !d.validFrom || !d.validUntil || Date.parse(d.validUntil) >= Date.parse(d.validFrom), {
    message: 'Promotional end date must be on or after the start date.',
    path: ['validUntil'],
});
exports.updateComboBundleSchema = comboBundleBaseSchema.partial();
