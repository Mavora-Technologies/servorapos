// apps/api/src/validators/staff.validator.ts
import { z } from 'zod';

const branchMembershipInputSchema = z.object({
  branchId: z.coerce.number().int().positive('Branch identifier must be a positive integer'),
  roleId: z.coerce.number().int().positive().nullable().optional(),
});

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(50)
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

const optionalPinSchema = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .refine(
    (v) => v === null || v === undefined || /^\d{4,6}$/.test(v),
    'POS Fast-Login PIN must be 4 to 6 numeric digits'
  );

export const listStaffQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  branchId: z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
    const n = Number(val);
    return Number.isNaN(n) ? val : n;
  }, z.number().int().positive().optional()),
  role: z
    .string()
    .trim()
    .transform((v) => (v === '' || v === 'ALL' ? undefined : v))
    .optional(),
  isActive: z.preprocess((val) => {
    if (val === undefined || val === null || val === '' || val === 'ALL') return undefined;
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return val;
  }, z.boolean().optional()),
});

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(100),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid work email address').max(255).toLowerCase(),
  phone: optionalPhoneSchema,
  role: z.string().trim().min(1, 'Operational role is mandatory').max(100),
  defaultBranchId: z.coerce.number().int().positive('Default operating branch is required'),
  branchMemberships: z.array(branchMembershipInputSchema).default([]),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  pin: optionalPinSchema,
});

export const updateStaffSchema = z.object({
  firstName: z.string().trim().min(2).max(100).optional(),
  lastName: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(255).toLowerCase().optional(),
  phone: optionalPhoneSchema,
  role: z.string().trim().min(1).max(100).optional(),
  defaultBranchId: z.coerce.number().int().positive().nullable().optional(),
  branchMemberships: z.array(branchMembershipInputSchema).optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : v))
    .optional()
    .refine((v) => v === undefined || v.length >= 8, 'Password must be at least 8 characters'),
  pin: optionalPinSchema,
});

export const toggleStaffStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().max(255).optional(),
});

export const resetPinSchema = z.object({
  pin: z.string().trim().regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
});

export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type BranchMembershipInput = z.infer<typeof branchMembershipInputSchema>;