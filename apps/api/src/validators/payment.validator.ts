import { z } from 'zod';

export const createPaymentSchema = z.object({
  paymentFlow: z.enum(['OUTBOUND_AP', 'INBOUND_AR']),
  paymentMethod: z.enum(['MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH_DRAWER', 'CREDIT_CARD']),
  clearingAccount: z.string().min(2, 'Clearing treasury channel is required').trim(),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  transactionReference: z.string().trim().optional().nullable(),
  supplierId: z.coerce.number().positive().optional().nullable(),
  supplierInvoiceId: z.coerce.number().positive().optional().nullable(),
  orderId: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const reversePaymentSchema = z.object({
  reason: z.string().min(3, 'Audit reversal reason is required'),
});

export const reconcilePaymentSchema = z.object({
  bankStatementRef: z.string().min(2, 'Bank statement reference is required'),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;