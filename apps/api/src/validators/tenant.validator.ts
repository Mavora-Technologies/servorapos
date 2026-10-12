import { z } from 'zod';

export const createTenantSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;