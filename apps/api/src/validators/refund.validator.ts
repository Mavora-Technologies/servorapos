import { z } from 'zod';

export const createRefundSchema = z.object({
  refundFlow: z.enum(['AR_CUSTOMER_REFUND', 'AP_VENDOR_REFUND']),
  orderId: z.coerce.number().positive().optional().nullable(),
  supplierId: z.coerce.number().positive().optional().nullable(),
  paymentId: z.coerce.number().positive().optional().nullable(),
  refundMethod: z.enum(['MPESA_REFUND', 'BANK_WIRE', 'CASH_DRAWER']),
  clearingAccount: z.string().min(2, 'Clearing treasury channel is required').trim(),
  amount: z.coerce.number().positive('Refund amount must be greater than zero'),
  restockItems: z.boolean().default(true),
  reasonCode: z.string().min(2, 'Refund reason code is required').trim(),
  transactionReference: z.string().trim().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;