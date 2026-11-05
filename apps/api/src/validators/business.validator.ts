import { z } from 'zod';

export const updateBusinessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business trading name must be at least 2 characters').trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional()
    .nullable(),
  legalName: z.string().max(255).optional().nullable(),
  kraPin: z
    .string()
    .max(50)
    .regex(/^[A-Z][0-9]{9}[A-Z]$/, 'Invalid KRA PIN format (e.g. P051234567Z)')
    .optional()
    .nullable()
    .or(z.literal('')),
  email: z.string().email('Invalid business contact email').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  currency: z.string().min(1).max(10).default('KES'),
  timezone: z.string().min(1).max(64).default('Africa/Nairobi'),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable().or(z.literal('')),
});

export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;