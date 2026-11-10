"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateSchema = exports.copyWeekSchema = exports.publishWeekSchema = exports.updateScheduleSchema = exports.createScheduleSchema = void 0;
const zod_1 = require("zod");
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
exports.createScheduleSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().positive('Staff member assignment is required'),
    branchId: zod_1.z.coerce.number().positive('Operating branch is required'),
    shiftDate: zod_1.z.string().regex(dateRegex, 'Shift date must be in YYYY-MM-DD format'),
    startTime: zod_1.z.string().regex(timeRegex, 'Start time must be HH:MM format (24h)'),
    endTime: zod_1.z.string().regex(timeRegex, 'End time must be HH:MM format (24h)'),
    breakMinutes: zod_1.z.coerce.number().min(0).max(300).default(30),
    role: zod_1.z.string().min(1, 'Operational role is required'),
    hourlyWage: zod_1.z.coerce.number().min(0).optional().default(0),
    templateId: zod_1.z.coerce.number().positive().optional().nullable(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.updateScheduleSchema = zod_1.z.object({
    userId: zod_1.z.coerce.number().positive().optional(),
    branchId: zod_1.z.coerce.number().positive().optional(),
    shiftDate: zod_1.z.string().regex(dateRegex).optional(),
    startTime: zod_1.z.string().regex(timeRegex).optional(),
    endTime: zod_1.z.string().regex(timeRegex).optional(),
    breakMinutes: zod_1.z.coerce.number().min(0).max(300).optional(),
    role: zod_1.z.string().optional(),
    hourlyWage: zod_1.z.coerce.number().min(0).optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'CONFIRMED', 'CANCELLED']).optional(),
    notes: zod_1.z.string().optional().nullable(),
});
exports.publishWeekSchema = zod_1.z.object({
    weekStart: zod_1.z.string().regex(dateRegex, 'weekStart must be YYYY-MM-DD (Monday)'),
    branchId: zod_1.z.coerce.number().positive().optional(),
});
exports.copyWeekSchema = zod_1.z.object({
    fromWeekStart: zod_1.z.string().regex(dateRegex, 'fromWeekStart must be YYYY-MM-DD (Monday)'),
    toWeekStart: zod_1.z.string().regex(dateRegex, 'toWeekStart must be YYYY-MM-DD (Monday)'),
    branchId: zod_1.z.coerce.number().positive().optional(),
});
exports.createTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Template name is required'),
    startTime: zod_1.z.string().regex(timeRegex, 'Start time must be HH:MM (24h)'),
    endTime: zod_1.z.string().regex(timeRegex, 'End time must be HH:MM (24h)'),
    breakMinutes: zod_1.z.coerce.number().min(0).max(300).default(30),
    colorHex: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g. #0554F4)'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
});
