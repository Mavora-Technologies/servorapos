"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPinSchema = exports.toggleStaffStatusSchema = exports.updateStaffSchema = exports.createStaffSchema = exports.listStaffQuerySchema = void 0;
// apps/api/src/validators/staff.validator.ts
const zod_1 = require("zod");
const branchMembershipInputSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive('Branch identifier must be a positive integer'),
    roleId: zod_1.z.coerce.number().int().positive().nullable().optional(),
});
const optionalPhoneSchema = zod_1.z
    .string()
    .trim()
    .max(50)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();
const optionalPinSchema = zod_1.z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .refine((v) => v === null || v === undefined || /^\d{4,6}$/.test(v), 'POS Fast-Login PIN must be 4 to 6 numeric digits');
exports.listStaffQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().max(120).optional(),
    branchId: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || val === '' || val === 'ALL')
            return undefined;
        const n = Number(val);
        return Number.isNaN(n) ? val : n;
    }, zod_1.z.number().int().positive().optional()),
    role: zod_1.z
        .string()
        .trim()
        .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
        .optional(),
    isActive: zod_1.z.preprocess((val) => {
        if (val === undefined || val === null || val === '' || val === 'ALL')
            return undefined;
        if (val === 'true' || val === true)
            return true;
        if (val === 'false' || val === false)
            return false;
        return val;
    }, zod_1.z.boolean().optional()),
});
exports.createStaffSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(2, 'First name must be at least 2 characters').max(100),
    lastName: zod_1.z.string().trim().min(2, 'Last name must be at least 2 characters').max(100),
    email: zod_1.z.string().trim().email('Invalid work email address').max(255).toLowerCase(),
    phone: optionalPhoneSchema,
    role: zod_1.z.string().trim().min(1, 'Operational role is mandatory').max(100),
    defaultBranchId: zod_1.z.coerce.number().int().positive('Default operating branch is required'),
    branchMemberships: zod_1.z.array(branchMembershipInputSchema).default([]),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters').max(128),
    pin: optionalPinSchema,
});
exports.updateStaffSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(2).max(100).optional(),
    lastName: zod_1.z.string().trim().min(2).max(100).optional(),
    email: zod_1.z.string().trim().email().max(255).toLowerCase().optional(),
    phone: optionalPhoneSchema,
    role: zod_1.z.string().trim().min(1).max(100).optional(),
    defaultBranchId: zod_1.z.coerce.number().int().positive().nullable().optional(),
    branchMemberships: zod_1.z.array(branchMembershipInputSchema).optional(),
    isActive: zod_1.z.boolean().optional(),
    password: zod_1.z
        .string()
        .transform((v) => (v.trim() === '' ? undefined : v))
        .optional()
        .refine((v) => v === undefined || v.length >= 8, 'Password must be at least 8 characters'),
    pin: optionalPinSchema,
});
exports.toggleStaffStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
    reason: zod_1.z.string().trim().max(255).optional(),
});
exports.resetPinSchema = zod_1.z.object({
    pin: zod_1.z.string().trim().regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
});
