// apps/api/src/validators/attendance.validator.ts
import { z } from 'zod';

const optionalPositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().optional());

const optionalDateStr = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isNaN(Date.parse(v)),
    'Invalid date format (expected YYYY-MM-DD or ISO 8601)'
  )
  .transform((v) => (v === '' ? undefined : v))
  .optional();

const optionalPin = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))
  .optional()
  .refine(
    (v) => v === undefined || /^\d{4,6}$/.test(v),
    'PIN must be 4 to 6 numeric digits'
  );

export const listAttendanceQuerySchema = z.object({
  startDate: optionalDateStr,
  endDate: optionalDateStr,
  branchId: optionalPositiveInt,
  userId: optionalPositiveInt,
  status: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
});

export const liveDutyQuerySchema = z.object({
  branchId: optionalPositiveInt,
});

export const clockInSchema = z.object({
  userId: z.coerce.number().int().positive('Employee ID is required'),
  branchId: z.coerce.number().int().positive('Operating branch is required'),
  pin: optionalPin,
  method: z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
  deviceInfo: z.string().trim().max(255).optional(),
  notes: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
});

export const clockOutSchema = z.object({
  attendanceId: z.coerce.number().int().positive('Attendance record identifier is required'),
  pin: optionalPin,
  breakMinutes: z.coerce.number().int().min(0).max(300).default(0),
  method: z.enum(['PIN', 'BIOMETRIC', 'PORTAL', 'NFC', 'MANUAL_OVERRIDE']).default('PORTAL'),
  notes: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? undefined : v))
    .optional(),
});

export const manualAdjustmentSchema = z.object({
  userId: z.coerce.number().int().positive('Employee ID is required'),
  branchId: z.coerce.number().int().positive('Branch ID is required'),
  scheduleId: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive().nullable()
  ),
  clockInAt: z.string().datetime({ message: 'Valid clock-in ISO timestamp is required' }),
  clockOutAt: z.string().datetime({ message: 'Valid clock-out ISO timestamp is required' }),
  breakMinutes: z.coerce.number().int().min(0).max(300).default(0),
  notes: z.string().trim().min(5, 'Audit justification (min 5 characters) is required').max(500),
});

export const approveAttendanceSchema = z.object({
  recordIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'Select at least one timesheet entry to approve')
    .max(200),
});

export const rejectAttendanceSchema = z.object({
  recordIds: z
    .array(z.coerce.number().int().positive())
    .min(1, 'Select at least one timesheet entry to reject')
    .max(200),
  reason: z.string().trim().min(3, 'Rejection reason is required').max(300),
});

export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type LiveDutyQuery = z.infer<typeof liveDutyQuerySchema>;
export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;
export type ApproveAttendanceInput = z.infer<typeof approveAttendanceSchema>;
export type RejectAttendanceInput = z.infer<typeof rejectAttendanceSchema>;