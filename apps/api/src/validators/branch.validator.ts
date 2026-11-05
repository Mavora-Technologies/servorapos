// apps/api/src/validators/branch.validator.ts
import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters').trim(),
  code: z
    .string()
    .min(2, 'Branch code must be at least 2 characters')
    .max(20, 'Branch code cannot exceed 20 characters')
    .trim()
    .toUpperCase(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  isMainBranch: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateBranchSchema = createBranchSchema.partial();

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;