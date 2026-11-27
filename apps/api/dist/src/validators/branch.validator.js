"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBranchSchema = exports.createBranchSchema = void 0;
// apps/api/src/validators/branch.validator.ts
const zod_1 = require("zod");
const optionalTrimmed = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional();
const optionalEmail = zod_1.z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine((val) => val === null || val === undefined || zod_1.z.string().email().safeParse(val).success, 'Invalid branch email address');
exports.createBranchSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Branch name must be at least 2 characters').max(255),
    code: zod_1.z
        .string()
        .trim()
        .min(2, 'Branch code must be at least 2 characters')
        .max(50, 'Branch code cannot exceed 50 characters')
        .transform((s) => s.toUpperCase()),
    address: optionalTrimmed,
    phone: optionalTrimmed,
    email: optionalEmail,
    kraPin: optionalTrimmed,
    etimsBranchId: zod_1.z
        .string()
        .trim()
        .max(20)
        .transform((val) => (val === '' ? '00' : val))
        .optional(),
    etimsDeviceSerial: optionalTrimmed,
    receiptFooter: optionalTrimmed,
    isMainBranch: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateBranchSchema = exports.createBranchSchema.partial();
