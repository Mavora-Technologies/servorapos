"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateSchema = exports.copyWeekSchema = exports.publishWeekSchema = exports.updateScheduleSchema = exports.createScheduleSchema = exports.getRosterQuerySchema = void 0;
// apps/api/src/validators/schedule.validator.ts
const zod_1 = require("zod");
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalNullableNote = zod_1.z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
const optionalPositiveInt = zod_1.z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL')
        return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
}, zod_1.z.number().int().positive().optional());
exports.getRosterQuerySchema = zod_1.z.object({
    weekStart: zod_1.z.string().regex(dateRegex, 'weekStart must be in YYYY-MM-DD format'),
    branchId: optionalPositiveInt,
    role: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
        .optional(),
});
exports.createScheduleSchema = zod_1.z
    .object({
    userId: zod_1.z.coerce.number().int().positive('Staff member assignment is required'),
    branchId: zod_1.z.coerce.number().int().positive('Operating branch is required'),
    shiftDate: zod_1.z.string().regex(dateRegex, 'Shift date must be in YYYY-MM-DD format'),
    startTime: zod_1.z.string().regex(timeRegex, 'Start time must be HH:MM format (24h)'),
    endTime: zod_1.z.string().regex(timeRegex, 'End time must be HH:MM format (24h)'),
    breakMinutes: zod_1.z.coerce.number().int().min(0).max(300).default(30),
    role: zod_1.z.string().trim().min(1, 'Operational role is required').max(100),
    hourlyWage: zod_1.z.coerce.number().min(0).max(1000000).optional().default(0),
    templateId: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().int().positive().nullable()),
    notes: optionalNullableNote,
})
    .refine((d) => d.startTime !== d.endTime, {
    message: 'Start time and end time cannot be identical.',
    path: ['endTime'],
});
exports.updateScheduleSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().int().positive().optional(),
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    shiftDate: zod_1.z.string().regex(dateRegex).optional(),
    startTime: zod_1.z.string().regex(timeRegex).optional(),
    endTime: zod_1.z.string().regex(timeRegex).optional(),
    breakMinutes: zod_1.z.coerce.number().int().min(0).max(300).optional(),
    role: zod_1.z.string().trim().min(1).max(100).optional(),
    hourlyWage: zod_1.z.coerce.number().min(0).max(1000000).optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'CONFIRMED', 'CANCELLED']).optional(),
    notes: optionalNullableNote,
});
exports.publishWeekSchema = zod_1.z.object({
    weekStart: zod_1.z.string().regex(dateRegex, 'weekStart must be YYYY-MM-DD (Monday)'),
    branchId: optionalPositiveInt,
});
exports.copyWeekSchema = zod_1.z
    .object({
    fromWeekStart: zod_1.z.string().regex(dateRegex, 'fromWeekStart must be YYYY-MM-DD (Monday)'),
    toWeekStart: zod_1.z.string().regex(dateRegex, 'toWeekStart must be YYYY-MM-DD (Monday)'),
    branchId: optionalPositiveInt,
})
    .refine((d) => d.fromWeekStart !== d.toWeekStart, {
    message: 'Source week and target week must be different.',
    path: ['toWeekStart'],
});
exports.createTemplateSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2, 'Template name is required').max(100),
    startTime: zod_1.z.string().regex(timeRegex, 'Start time must be HH:MM (24h)'),
    endTime: zod_1.z.string().regex(timeRegex, 'End time must be HH:MM (24h)'),
    breakMinutes: zod_1.z.coerce.number().int().min(0).max(300).default(30),
    colorHex: zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #0554F4)')
        .default('#0554F4'),
    branchId: zod_1.z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), zod_1.z.number().int().positive().nullable()),
})
    .refine((d) => d.startTime !== d.endTime, {
    message: 'Template start and end time cannot be identical.',
    path: ['endTime'],
});
