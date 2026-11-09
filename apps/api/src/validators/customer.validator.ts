import { z } from 'zod';

export const customerTypeEnum = z.enum(['RETAIL', 'CORPORATE', 'VIP', 'WHOLESALE']);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name is required'),
  phone: z.string().trim().min(5, 'Valid phone number required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  kraPin: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  customerType: customerTypeEnum.default('RETAIL'),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  branchId: z.coerce.number().positive().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  customerType: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['NAME', 'TOTAL_SPENT', 'ORDERS_COUNT', 'CREATED_AT']).default('CREATED_AT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;