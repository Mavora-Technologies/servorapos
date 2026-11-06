"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUnitConversionSchema = exports.createUnitConversionSchema = void 0;
// apps/api/src/validators/unit-conversion.validator.ts
const zod_1 = require("zod");
exports.createUnitConversionSchema = zod_1.z.object({
    fromUnit: zod_1.z.string().min(1, 'Source unit is required').trim(),
    toUnit: zod_1.z.string().min(1, 'Target base unit is required').trim(),
    conversionFactor: zod_1.z.coerce.number().positive('Conversion factor must be greater than 0'),
    inventoryItemId: zod_1.z.coerce.number().positive().optional().nullable(),
    unitCategory: zod_1.z.enum(['WEIGHT', 'VOLUME', 'PACKAGING', 'CUSTOM']).default('PACKAGING'),
    description: zod_1.z.string().optional().nullable(),
});
exports.updateUnitConversionSchema = exports.createUnitConversionSchema.partial();
