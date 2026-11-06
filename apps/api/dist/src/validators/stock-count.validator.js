"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStockCountSchema = exports.updateCountLineSchema = exports.initiateStockCountSchema = void 0;
const zod_1 = require("zod");
exports.initiateStockCountSchema = zod_1.z.object({
    countType: zod_1.z.enum(['FULL', 'CYCLE', 'SPOT_CHECK']).default('FULL'),
    category: zod_1.z.string().optional().nullable(),
    isBlindCount: zod_1.z.boolean().default(true),
    notes: zod_1.z.string().optional().nullable(),
});
exports.updateCountLineSchema = zod_1.z.object({
    countedQuantity: zod_1.z.coerce.number().min(0, 'Physical count must be non-negative'),
    notes: zod_1.z.string().optional().nullable(),
});
exports.reconcileStockCountSchema = zod_1.z.object({
    notes: zod_1.z.string().optional().nullable(),
});
