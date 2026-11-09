import { z } from 'zod';

export const clockInSchema = z.object({
  userId: z.coerce.number().positive('Employee ID is required'),
  branchId: z.coerce.number().positive('Operating branch is required'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 numeric digits').optional(),
  method: z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
  deviceInfo: z.string().optional(),
  notes: z.string().optional(),
});

export const clockOutSchema = z.object({
  attendanceId: z.coerce.number().positive('Attendance record identifier is required'),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 numeric digits').optional(),
  breakMinutes: z.coerce.number().min(0).max(300).default(0),
  method: z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
  notes: z.string().optional(),
});

export const manualAdjustmentSchema = z.object({
  userId: z.coerce.number().positive('Employee ID is required'),
  branchId: z.coerce.number().positive('Branch ID is required'),
  scheduleId: z.coerce.number().positive().optional().nullable(),
  clockInAt: z.string().datetime({ message: 'Valid clock-in ISO timestamp is required' }),
  clockOutAt: z.string().datetime({ message: 'Valid clock-out ISO timestamp is required' }),
  breakMinutes: z.coerce.number().min(0).max(300).default(0),
  notes: z.string().min(5, 'Reason for manual adjustment is required for audit trails'),
});

export const approveAttendanceSchema = z.object({
  recordIds: z.array(z.coerce.number().positive()).min(1, 'Select at least one timesheet entry to approve'),
});

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;
export type ApproveAttendanceInput = z.infer<typeof approveAttendanceSchema>;