// apps/api/src/validators/billing.validator.ts
import { z } from 'zod';

export const PAYMENT_METHOD_TYPES = [
  'CARD',
  'MPESA_STANDING_ORDER',
  'DIRECT_DEBIT',
  'CORPORATE_INVOICE',
] as const;

export const INVOICE_STATUSES = [
  'DRAFT',
  'PENDING',
  'PAID',
  'OVERDUE',
  'VOID',
  'ALL',
] as const;

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

export const updateSubscriptionPlanSchema = z.object({
  planId: z.coerce.number().int().positive('Valid plan identifier is required'),
  seatAllocation: z.coerce.number().int().min(1, 'At least 1 operator seat is required'),
  branchAllocation: z.coerce.number().int().min(1, 'At least 1 branch allocation is required'),
  autoRenew: z.boolean().default(true),
  cancelAtPeriodEnd: z.boolean().optional().default(false),
});

export const addPaymentMethodSchema = z.object({
  type: z.enum(PAYMENT_METHOD_TYPES),
  provider: z.string().trim().min(2, 'Provider identifier is required').max(50),
  accountMask: z.string().trim().min(3, 'Card or account mask reference is required').max(50),
  brandOrBank: optionalTrimmed,
  expiryMonth: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(1).max(12).nullable()
  ),
  expiryYear: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(2025).max(2045).nullable()
  ),
  token: z.string().trim().min(4, 'Token authorization reference is required').max(255),
  isDefault: z.boolean().default(false),
});

export const listInvoicesQuerySchema = z.object({
  status: z.enum(INVOICE_STATUSES).default('ALL'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const settleInvoiceSchema = z.object({
  invoiceId: z.coerce.number().int().positive('Invoice identifier is required'),
  paymentMethodId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().positive().nullable().optional()
  ),
  manualReference: optionalTrimmed,
});

export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type SettleInvoiceInput = z.infer<typeof settleInvoiceSchema>;