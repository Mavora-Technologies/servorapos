"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveAttendanceSchema = exports.manualAdjustmentSchema = exports.clockOutSchema = exports.clockInSchema = void 0;
const zod_1 = require("zod");
exports.clockInSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().positive('Employee ID is required'),
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    pin: zod_1.z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 numeric digits').optional(),
    method: zod_1.z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
    deviceInfo: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.clockOutSchema = zod_1.z.object({
    attendanceId: zod_1.z.coerce.number().positive('Attendance record identifier is required'),
    pin: zod_1.z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 numeric digits').optional(),
    breakMinutes: zod_1.z.coerce.number().min(0).max(300).default(0),
    method: zod_1.z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
    notes: zod_1.z.string().optional(),
});
exports.manualAdjustmentSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().positive('Employee ID is required'),
    branchId: zod_1.z.coerce.number().positive('Branch ID is required'),
    scheduleId: zod_1.z.coerce.number().positive().optional().nullable(),
    clockInAt: zod_1.z.string().datetime({ message: 'Valid clock-in ISO timestamp is required' }),
    clockOutAt: zod_1.z.string().datetime({ message: 'Valid clock-out ISO timestamp is required' }),
    breakMinutes: zod_1.z.coerce.number().min(0).max(300).default(0),
    notes: zod_1.z.string().min(5, 'Reason for manual adjustment is required for audit trails'),
});
exports.approveAttendanceSchema = zod_1.z.object({
    recordIds: zod_1.z.array(zod_1.z.coerce.number().positive()).min(1, 'Select at least one timesheet entry to approve'),
});
