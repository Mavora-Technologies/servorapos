import { z } from 'zod';

export const createExpenseSchema = z.object({
  branchId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive('Expense category is required'),
  expenseType: z.enum(['EMPLOYEE_REIMBURSEMENT', 'STORE_OPERATIONAL', 'PETTY_CASH_DISBURSEMENT']).default('EMPLOYEE_REIMBURSEMENT'),
  payeeName: z.string().trim().max(255).optional().nullable(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  taxAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(['CASH_DRAWER', 'MPESA_B2C', 'BANK_WIRE', 'PETTY_CASH']).default('CASH_DRAWER'),
  merchantTaxPin: z.string().trim().max(50).optional().nullable(),
  receiptNumber: z.string().trim().max(100).optional().nullable(),
  receiptAttachmentUrl: z.string().url().optional().nullable().or(z.literal('')),
  description: z.string().trim().min(3, 'Description must be at least 3 characters').max(1000),
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'PAID_DISBURSED']),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
  paymentReference: z.string().trim().max(100).optional().nullable(),
});

export const listExpensesQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  claimantId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID_DISBURSED']).default('ALL'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseStatusInput = z.infer<typeof updateExpenseStatusSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;