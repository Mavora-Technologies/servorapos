"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUnitConversionSchema = exports.createUnitConversionSchema = exports.UNIT_CATEGORIES = void 0;
// apps/api/src/validators/unit-conversion.validator.ts
const zod_1 = require("zod");
exports.UNIT_CATEGORIES = ['WEIGHT', 'VOLUME', 'PACKAGING', 'CUSTOM'];
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .max(255, 'Description must be 255 characters or fewer')
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
const unitConversionBaseSchema = zod_1.z.object({
    fromUnit: zod_1.z.string().trim().min(1, 'Source unit is required').max(50),
    toUnit: zod_1.z.string().trim().min(1, 'Base ledger unit is required').max(50),
    conversionFactor: zod_1.z.coerce
        .number()
        .positive('Conversion factor must be greater than zero'),
    inventoryItemId: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().positive('Invalid inventory item reference').nullable()),
    unitCategory: zod_1.z.enum(exports.UNIT_CATEGORIES).default('PACKAGING'),
    description: optionalTrimmed,
    isDefault: zod_1.z.boolean().default(false),
});
exports.createUnitConversionSchema = unitConversionBaseSchema.superRefine((data, ctx) => {
    if (data.fromUnit.toLowerCase() === data.toUnit.toLowerCase()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['toUnit'],
            message: 'Source unit and base ledger unit cannot be identical.',
        });
    }
});
// Zod v4 safe: .partial() applied on unrefined base schema
exports.updateUnitConversionSchema = unitConversionBaseSchema.partial();
