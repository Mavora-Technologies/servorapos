"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStockCountSchema = exports.updateCountLineSchema = exports.initiateStockCountSchema = exports.COUNT_TYPES = void 0;
// apps/api/src/validators/stock-count.validator.ts
const zod_1 = require("zod");
exports.COUNT_TYPES = ['FULL', 'CYCLE', 'SPOT_CHECK'];
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
exports.initiateStockCountSchema = zod_1.z
    .object({
    countType: zod_1.z.enum(exports.COUNT_TYPES).default('FULL'),
    category: optionalTrimmed,
    inventoryItemIds: zod_1.z.array(zod_1.z.coerce.number().int().positive()).optional(),
    isBlindCount: zod_1.z.boolean().default(true),
    notes: optionalTrimmed,
})
    .superRefine((data, ctx) => {
    if (data.countType === 'CYCLE' && !data.category) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['category'],
            message: 'A target category is required for a Cycle Count audit.',
        });
    }
    if (data.countType === 'SPOT_CHECK' &&
        (!data.inventoryItemIds || data.inventoryItemIds.length === 0)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['inventoryItemIds'],
            message: 'Please select at least one product for a Spot Check audit.',
        });
    }
});
exports.updateCountLineSchema = zod_1.z.object({
    countedQuantity: zod_1.z.coerce.number().min(0, 'Physical count must be zero or greater'),
    notes: optionalTrimmed,
});
exports.reconcileStockCountSchema = zod_1.z.object({
    notes: optionalTrimmed,
});
