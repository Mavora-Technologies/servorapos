// apps/api/src/validators/user.validator.ts
import { z } from 'zod';

export const createStaffSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Temporary password required'),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'WAITER']), // Admin chooses this
  branchId: z.number().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;