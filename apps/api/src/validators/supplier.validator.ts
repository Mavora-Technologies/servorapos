import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters').trim(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  kraPin: z
    .string()
    .max(50)
    .regex(/^[A-Z][0-9]{9}[A-Z]$/, 'Invalid KRA PIN (e.g. P051234567Z)')
    .optional()
    .nullable()
    .or(z.literal('')),
  physicalAddress: z.string().optional().nullable(),
  city: z.string().default('Nairobi'),
  paymentTerms: z
    .enum(['COD', 'NET_7', 'NET_14', 'NET_30', 'PREPAID'])
    .default('NET_30'),
  leadTimeDays: z.coerce.number().min(0).default(2),
  bankName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  mpesaPaybillNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;