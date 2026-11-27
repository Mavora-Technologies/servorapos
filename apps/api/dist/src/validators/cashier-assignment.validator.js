"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAssignmentSchema = exports.updateCashierAssignmentSchema = exports.createCashierAssignmentSchema = exports.assignmentContextQuerySchema = exports.listCashierAssignmentsQuerySchema = void 0;
// apps/api/src/validators/cashier-assignment.validator.ts
const zod_1 = require("zod");
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalPositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().optional());
const optionalNullableNote = zod_1.z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
exports.listCashierAssignmentsQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().regex(dateRegex, 'startDate must be YYYY-MM-DD').optional(),
    endDate: zod_1.z.string().regex(dateRegex, 'endDate must be YYYY-MM-DD').optional(),
    branchId: optionalPositiveInt,
    userId: optionalPositiveInt,
    status: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
        .optional(),
});
exports.assignmentContextQuerySchema = zod_1.z.object({
    branchId: optionalPositiveInt,
});
exports.createCashierAssignmentSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive('Operating branch is required'),
    cashDrawerId: zod_1.z.coerce.number().int().positive('Target cash drawer register is required'),
    userId: zod_1.z.coerce.number().int().positive('Designated cashier/custodian is required'),
    assignmentDate: zod_1.z
        .string()
        .regex(dateRegex, 'Valid assignment date required (YYYY-MM-DD)'),
    shiftType: zod_1.z.enum(['MORNING', 'MIDDAY', 'EVENING', 'NIGHT_CLOSING']).default('MORNING'),
    allocatedFloat: zod_1.z.coerce.number().min(0, 'Opening float cannot be negative').default(0),
    maxCashLimit: zod_1.z.coerce
        .number()
        .min(1000, 'Threshold cash limit must be at least 1,000')
        .default(50000),
    allowRefunds: zod_1.z.boolean().default(false),
    allowDrawerPop: zod_1.z.boolean().default(true),
    allowManualDiscount: zod_1.z.boolean().default(false),
    maxDiscountPercent: zod_1.z.coerce.number().int().min(0).max(100).default(0),
    handoverNotes: optionalNullableNote,
});
exports.updateCashierAssignmentSchema = zod_1.z.object({
    status: zod_1.z.enum(['ASSIGNED', 'ACTIVE', 'RELEASED', 'REVOKED']).optional(),
    allocatedFloat: zod_1.z.coerce.number().min(0).optional(),
    maxCashLimit: zod_1.z.coerce.number().min(1000).optional(),
    allowRefunds: zod_1.z.boolean().optional(),
    allowDrawerPop: zod_1.z.boolean().optional(),
    allowManualDiscount: zod_1.z.boolean().optional(),
    maxDiscountPercent: zod_1.z.coerce.number().int().min(0).max(100).optional(),
    handoverNotes: optionalNullableNote,
});
exports.revokeAssignmentSchema = zod_1.z.object({
    reason: zod_1.z
        .string()
        .trim()
        .min(3, 'Mandatory revocation reason (min 3 characters) is required for compliance')
        .max(500),
});
