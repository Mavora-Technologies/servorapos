// apps/api/src/validators/schedule.validator.ts
import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const optionalNullableNote = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const optionalPositiveInt = z.preprocess((val) => {
  if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
}, z.number().int().positive().optional());

export const getRosterQuerySchema = z.object({
  weekStart: z.string().regex(dateRegex, 'weekStart must be in YYYY-MM-DD format'),
  branchId: optionalPositiveInt,
  role: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
});

export const createScheduleSchema = z
  .object({
    userId: z.coerce.number().int().positive('Staff member assignment is required'),
    branchId: z.coerce.number().int().positive('Operating branch is required'),
    shiftDate: z.string().regex(dateRegex, 'Shift date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(timeRegex, 'Start time must be HH:MM format (24h)'),
    endTime: z.string().regex(timeRegex, 'End time must be HH:MM format (24h)'),
    breakMinutes: z.coerce.number().int().min(0).max(300).default(30),
    role: z.string().trim().min(1, 'Operational role is required').max(100),
    hourlyWage: z.coerce.number().min(0).max(1000000).optional().default(0),
    templateId: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().positive().nullable()
    ),
    notes: optionalNullableNote,
  })
  .refine((d) => d.startTime !== d.endTime, {
    message: 'Start time and end time cannot be identical.',
    path: ['endTime'],
  });

export const updateScheduleSchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  branchId: z.coerce.number().int().positive().optional(),
  shiftDate: z.string().regex(dateRegex).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  breakMinutes: z.coerce.number().int().min(0).max(300).optional(),
  role: z.string().trim().min(1).max(100).optional(),
  hourlyWage: z.coerce.number().min(0).max(1000000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CONFIRMED', 'CANCELLED']).optional(),
  notes: optionalNullableNote,
});

export const publishWeekSchema = z.object({
  weekStart: z.string().regex(dateRegex, 'weekStart must be YYYY-MM-DD (Monday)'),
  branchId: optionalPositiveInt,
});

export const copyWeekSchema = z
  .object({
    fromWeekStart: z.string().regex(dateRegex, 'fromWeekStart must be YYYY-MM-DD (Monday)'),
    toWeekStart: z.string().regex(dateRegex, 'toWeekStart must be YYYY-MM-DD (Monday)'),
    branchId: optionalPositiveInt,
  })
  .refine((d) => d.fromWeekStart !== d.toWeekStart, {
    message: 'Source week and target week must be different.',
    path: ['toWeekStart'],
  });

export const createTemplateSchema = z
  .object({
    name: z.string().trim().min(2, 'Template name is required').max(100),
    startTime: z.string().regex(timeRegex, 'Start time must be HH:MM (24h)'),
    endTime: z.string().regex(timeRegex, 'End time must be HH:MM (24h)'),
    breakMinutes: z.coerce.number().int().min(0).max(300).default(30),
    colorHex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #0554F4)')
      .default('#0554F4'),
    branchId: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
      z.number().int().positive().nullable()
    ),
  })
  .refine((d) => d.startTime !== d.endTime, {
    message: 'Template start and end time cannot be identical.',
    path: ['endTime'],
  });

export type GetRosterQuery = z.infer<typeof getRosterQuerySchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type PublishWeekInput = z.infer<typeof publishWeekSchema>;
export type CopyWeekInput = z.infer<typeof copyWeekSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;