"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listShiftsQuerySchema = exports.shiftCashMovementSchema = exports.closeShiftSchema = exports.openShiftSchema = void 0;
const zod_1 = require("zod");
exports.openShiftSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive(),
    cashierId: zod_1.z.coerce.number().int().positive().optional(), // Optional: defaults to authenticated user; managers can open for staff
    cashDrawerId: zod_1.z.coerce.number().int().positive().optional(),
    shiftType: zod_1.z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
    openingFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative'),
    notes: zod_1.z.string().max(500).optional(),
});
exports.closeShiftSchema = zod_1.z.object({
    shiftId: zod_1.z.coerce.number().int().positive(),
    countedCash: zod_1.z.coerce.number().min(0, 'Counted cash cannot be negative'),
    denominations: zod_1.z.record(zod_1.z.string(), zod_1.z.number().min(0)).optional(),
    varianceNotes: zod_1.z.string().max(500).optional(),
});
exports.shiftCashMovementSchema = zod_1.z.object({
    shiftId: zod_1.z.coerce.number().int().positive(),
    movementType: zod_1.z.enum(['SAFE_DROP', 'PETTY_CASH_PAYOUT']),
    amount: zod_1.z.coerce.number().positive('Amount must be greater than zero'),
    reason: zod_1.z.string().min(2, 'Audit reason is required').max(300),
});
exports.listShiftsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    cashierId: zod_1.z.coerce.number().int().positive().optional(),
    status: zod_1.z.enum(['ALL', 'OPEN', 'CLOSED']).default('ALL'),
    search: zod_1.z.string().trim().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(25),
});
