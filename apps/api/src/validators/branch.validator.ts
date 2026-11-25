// apps/api/src/validators/branch.validator.ts
import { z } from 'zod';

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional()
  .refine(
    (val) => val === null || val === undefined || z.string().email().safeParse(val).success,
    'Invalid branch email address'
  );

export const createBranchSchema = z.object({
  name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(255),
  code: z
    .string()
    .trim()
    .min(2, 'Branch code must be at least 2 characters')
    .max(50, 'Branch code cannot exceed 50 characters')
    .transform((s) => s.toUpperCase()),
  address: optionalTrimmed,
  phone: optionalTrimmed,
  email: optionalEmail,
  kraPin: optionalTrimmed,
  etimsBranchId: z
    .string()
    .trim()
    .max(20)
    .transform((val) => (val === '' ? '00' : val))
    .optional(),
  etimsDeviceSerial: optionalTrimmed,
  receiptFooter: optionalTrimmed,
  isMainBranch: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateBranchSchema = createBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;