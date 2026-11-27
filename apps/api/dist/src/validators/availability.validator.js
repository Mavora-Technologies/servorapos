"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAvailabilityToggleSchema = exports.updateAvailabilitySchema = exports.availabilityQuerySchema = void 0;
// apps/api/src/validators/availability.validator.ts
const zod_1 = require("zod");
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .max(150, 'Reason must be 150 characters or fewer')
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
exports.availabilityQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
});
exports.updateAvailabilitySchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().int().positive('Valid menu item ID is required'),
    branchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
    is86ed: zod_1.z.boolean(),
    reason: optionalTrimmed,
    remainingCount: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().min(0, 'Remaining count cannot be negative').nullable()),
    autoResetTomorrow: zod_1.z.boolean().optional().default(false),
});
exports.bulkAvailabilityToggleSchema = zod_1.z.object({
    menuItemIds: zod_1.z
        .array(zod_1.z.coerce.number().int().positive('Valid menu item ID is required'))
        .min(1, 'Select at least one menu item'),
    branchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
    is86ed: zod_1.z.boolean(),
    reason: optionalTrimmed,
    autoResetTomorrow: zod_1.z.boolean().optional().default(false),
});
