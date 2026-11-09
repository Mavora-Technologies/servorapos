import { z } from 'zod';

export const updateSubscriptionPlanSchema = z.object({
  planId: z.coerce.number().positive('Valid plan identifier is required'),
  seatAllocation: z.coerce.number().int().min(1, 'At least 1 operator seat is required'),
  branchAllocation: z.coerce.number().int().min(1, 'At least 1 branch allocation is required'),
  autoRenew: z.boolean().default(true),
});

export const addPaymentMethodSchema = z.object({
  type: z.enum(['CARD', 'MPESA_STANDING_ORDER', 'DIRECT_DEBIT', 'CORPORATE_INVOICE']),
  provider: z.string().trim().min(2, 'Provider identifier is required'),
  accountMask: z.string().trim().min(3, 'Card or account mask reference is required'),
  brandOrBank: z.string().trim().optional().nullable(),
  expiryMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
  expiryYear: z.coerce.number().int().min(2025).max(2040).optional().nullable(),
  token: z.string().trim().min(2, 'Token authorization reference is required'),
  isDefault: z.boolean().default(false),
});

export const listInvoicesQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'VOID', 'ALL']).default('ALL'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const settleInvoiceSchema = z.object({
  invoiceId: z.coerce.number().positive('Invoice identifier is required'),
  paymentMethodId: z.coerce.number().positive().optional().nullable(),
  manualReference: z.string().trim().optional().nullable(),
});

export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type SettleInvoiceInput = z.infer<typeof settleInvoiceSchema>;