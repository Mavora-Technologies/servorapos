import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createScheduleSchema = z.object({
  userId: z.coerce.number().positive('Staff member assignment is required'),
  branchId: z.coerce.number().positive('Operating branch is required'),
  shiftDate: z.string().regex(dateRegex, 'Shift date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:MM format (24h)'),
  endTime: z.string().regex(timeRegex, 'End time must be HH:MM format (24h)'),
  breakMinutes: z.coerce.number().min(0).max(300).default(30),
  role: z.string().min(1, 'Operational role is required'),
  hourlyWage: z.coerce.number().min(0).optional().default(0),
  templateId: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateScheduleSchema = z.object({
  userId: z.coerce.number().positive().optional(),
  branchId: z.coerce.number().positive().optional(),
  shiftDate: z.string().regex(dateRegex).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  breakMinutes: z.coerce.number().min(0).max(300).optional(),
  role: z.string().optional(),
  hourlyWage: z.coerce.number().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CONFIRMED', 'CANCELLED']).optional(),
  notes: z.string().optional().nullable(),
});

export const publishWeekSchema = z.object({
  weekStart: z.string().regex(dateRegex, 'weekStart must be YYYY-MM-DD (Monday)'),
  branchId: z.coerce.number().positive().optional(),
});

export const copyWeekSchema = z.object({
  fromWeekStart: z.string().regex(dateRegex, 'fromWeekStart must be YYYY-MM-DD (Monday)'),
  toWeekStart: z.string().regex(dateRegex, 'toWeekStart must be YYYY-MM-DD (Monday)'),
  branchId: z.coerce.number().positive().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  startTime: z.string().regex(timeRegex, 'Start time must be HH:MM (24h)'),
  endTime: z.string().regex(timeRegex, 'End time must be HH:MM (24h)'),
  breakMinutes: z.coerce.number().min(0).max(300).default(30),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #0554F4)'),
  branchId: z.coerce.number().positive().optional().nullable(),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type PublishWeekInput = z.infer<typeof publishWeekSchema>;
export type CopyWeekInput = z.infer<typeof copyWeekSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;