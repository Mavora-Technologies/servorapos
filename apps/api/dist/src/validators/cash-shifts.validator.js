"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listShiftsQuerySchema = exports.recordDropOrPayoutSchema = exports.closeShiftSchema = exports.openShiftSchema = void 0;
const zod_1 = require("zod");
exports.openShiftSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive('Branch ID is required'),
    cashDrawerId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    openingFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative').default(0),
    shiftType: zod_1.z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
});
exports.closeShiftSchema = zod_1.z.object({
    shiftId: zod_1.z.coerce.number().int().positive('Shift ID is required'),
    countedCash: zod_1.z.coerce.number().min(0, 'Counted cash cannot be negative'),
    denominations: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().int().min(0)).optional().default({}),
    varianceNotes: zod_1.z.string().trim().max(1000).optional().nullable(),
});
exports.recordDropOrPayoutSchema = zod_1.z.object({
    shiftId: zod_1.z.coerce.number().int().positive('Shift ID is required'),
    type: zod_1.z.enum(['SAFE_DROP', 'PETTY_CASH_PAYOUT']),
    amount: zod_1.z.coerce.number().positive('Amount must be greater than zero'),
    reason: zod_1.z.string().trim().min(3, 'Reason must be provided').max(255),
});
exports.listShiftsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    cashierId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.enum(['ALL', 'OPEN', 'CLOSED']).default('ALL'),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
