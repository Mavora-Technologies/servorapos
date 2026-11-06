"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkAvailabilityToggleSchema = exports.updateAvailabilitySchema = void 0;
// apps/api/src/validators/availability.validator.ts
const zod_1 = require("zod");
exports.updateAvailabilitySchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().positive(),
    is86ed: zod_1.z.boolean(),
    reason: zod_1.z.string().optional().nullable(),
    remainingCount: zod_1.z.coerce.number().int().min(0).optional().nullable(),
    autoResetTomorrow: zod_1.z.boolean().optional(),
});
exports.bulkAvailabilityToggleSchema = zod_1.z.object({
    menuItemIds: zod_1.z.array(zod_1.z.coerce.number().positive()).min(1),
    is86ed: zod_1.z.boolean(),
    reason: zod_1.z.string().optional().nullable(),
});
