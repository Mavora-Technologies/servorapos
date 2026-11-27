"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAttendanceSchema = exports.approveAttendanceSchema = exports.manualAdjustmentSchema = exports.clockOutSchema = exports.clockInSchema = exports.liveDutyQuerySchema = exports.listAttendanceQuerySchema = void 0;
// apps/api/src/validators/attendance.validator.ts
const zod_1 = require("zod");
const optionalPositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().optional());
const optionalDateStr = zod_1.z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)), 'Invalid date format (expected YYYY-MM-DD or ISO 8601)')
    .transform((v) => (v === '' ? undefined : v))
    .optional();
const optionalPin = zod_1.z
    .string()
    .trim()
    .transform((v) => (v === '' ? undefined : v))
    .optional()
    .refine((v) => v === undefined || /^\d{4,6}$/.test(v), 'PIN must be 4 to 6 numeric digits');
exports.listAttendanceQuerySchema = zod_1.z.object({
    startDate: optionalDateStr,
    endDate: optionalDateStr,
    branchId: optionalPositiveInt,
    userId: optionalPositiveInt,
    status: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
        .optional(),
});
exports.liveDutyQuerySchema = zod_1.z.object({
    branchId: optionalPositiveInt,
});
exports.clockInSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().int().positive('Employee ID is required'),
    branchId: zod_1.z.coerce.number().int().positive('Operating branch is required'),
    pin: optionalPin,
    method: zod_1.z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
    deviceInfo: zod_1.z.string().trim().max(255).optional(),
    notes: zod_1.z
        .string()
        .trim()
        .max(500)
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
});
exports.clockOutSchema = zod_1.z.object({
    attendanceId: zod_1.z.coerce.number().int().positive('Attendance record identifier is required'),
    pin: optionalPin,
    breakMinutes: zod_1.z.coerce.number().int().min(0).max(300).default(0),
    method: zod_1.z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
    notes: zod_1.z
        .string()
        .trim()
        .max(500)
        .transform((v) => (v === '' ? undefined : v))
        .optional(),
});
exports.manualAdjustmentSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().int().positive('Employee ID is required'),
    branchId: zod_1.z.coerce.number().int().positive('Branch ID is required'),
    scheduleId: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().int().positive().nullable()),
    clockInAt: zod_1.z.string().datetime({ message: 'Valid clock-in ISO timestamp is required' }),
    clockOutAt: zod_1.z.string().datetime({ message: 'Valid clock-out ISO timestamp is required' }),
    breakMinutes: zod_1.z.coerce.number().int().min(0).max(300).default(0),
    notes: zod_1.z.string().trim().min(5, 'Audit justification (min 5 characters) is required').max(500),
});
exports.approveAttendanceSchema = zod_1.z.object({
    recordIds: zod_1.z
        .array(zod_1.z.coerce.number().int().positive())
        .min(1, 'Select at least one timesheet entry to approve')
        .max(200),
});
exports.rejectAttendanceSchema = zod_1.z.object({
    recordIds: zod_1.z
        .array(zod_1.z.coerce.number().int().positive())
        .min(1, 'Select at least one timesheet entry to reject')
        .max(200),
    reason: zod_1.z.string().trim().min(3, 'Rejection reason is required').max(300),
});
