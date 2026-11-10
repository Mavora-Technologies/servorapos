"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustForecastModifierSchema = exports.forecastingQuerySchema = void 0;
const zod_1 = require("zod");
exports.forecastingQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    horizonDays: zod_1.z.coerce.number().int().min(3).max(30).default(7),
    startDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    weatherCondition: zod_1.z.enum(['CLEAR_NORMAL', 'RAIN_HEAVY', 'HEATWAVE', 'COLD_SNAP']).default('CLEAR_NORMAL'),
    targetLaborCostPct: zod_1.z.coerce.number().min(10).max(40).default(22.0), // e.g. target 22% labor to revenue
});
exports.adjustForecastModifierSchema = zod_1.z.object({
    snapshotId: zod_1.z.coerce.number().positive('Snapshot ID is required'),
    localEventModifier: zod_1.z.string().trim().max(150).optional().nullable(),
    varianceAdjustmentPct: zod_1.z.coerce.number().min(-30).max(50).default(0), // Manual operational hedge
});
