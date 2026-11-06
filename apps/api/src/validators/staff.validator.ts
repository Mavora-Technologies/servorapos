import { z } from 'zod';

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().trim().min(2, 'Last name must be at least 2 characters'),
  email: z.string().trim().email('Invalid work email address').toLowerCase(),
  phone: z.string().trim().optional().nullable(),
  role: z.string().min(1, 'Operational role is mandatory'),
  defaultBranchId: z.coerce.number().positive('Default operating branch is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, 'POS Fast-Login PIN must be 4 to 6 numeric digits')
    .optional()
    .nullable(),
});

export const updateStaffSchema = z.object({
  firstName: z.string().trim().min(2).optional(),
  lastName: z.string().trim().min(2).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().optional().nullable(),
  role: z.string().optional(),
  defaultBranchId: z.coerce.number().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional().nullable(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits')
    .optional()
    .nullable(),
});

export const toggleStaffStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetPinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'POS PIN must be 4 to 6 numeric digits'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;