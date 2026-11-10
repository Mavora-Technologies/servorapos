"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPinSchema = exports.toggleStaffStatusSchema = exports.updateStaffSchema = exports.createStaffSchema = void 0;
const zod_1 = require("zod");
exports.createStaffSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: zod_1.z.string().trim().min(2, 'Last name must be at least 2 characters'),
    email: zod_1.z.string().trim().email('Invalid work email address').toLowerCase(),
    phone: zod_1.z.string().trim().optional().nullable(),
    role: zod_1.z.string().min(1, 'Operational role is mandatory'),
    defaultBranchId: zod_1.z.coerce.number().positive('Default operating branch is required'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    pin: zod_1.z
        .string()
        .regex(/^\d{4,6}$/, 'POS Fast-Login PIN must be 4 to 6 numeric digits')
        .optional()
        .nullable(),
});
exports.updateStaffSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(2).optional(),
    lastName: zod_1.z.string().trim().min(2).optional(),
    email: zod_1.z.string().trim().email().toLowerCase().optional(),
    phone: zod_1.z.string().trim().optional().nullable(),
    role: zod_1.z.string().optional(),
    defaultBranchId: zod_1.z.coerce.number().positive().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
    password: zod_1.z.string().min(8).optional().nullable(),
    pin: zod_1.z
        .string()
        .regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits')
        .optional()
        .nullable(),
});
exports.toggleStaffStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
exports.resetPinSchema = zod_1.z.object({
    pin: zod_1.z.string().regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
});
