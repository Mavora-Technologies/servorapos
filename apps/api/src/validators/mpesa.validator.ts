import { z } from 'zod';

export const initiateStkPushSchema = z.object({
  phoneNumber: z.string().regex(/^(?:254|\+254|0)?([17]\d{8})$/, 'Invalid Kenyan phone number'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  accountReference: z.string().min(1, 'Account reference is required').trim(),
  orderId: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const initiateB2BPaymentSchema = z.object({
  businessShortCode: z.string().min(5, 'Paybill or Till number is required').trim(),
  receiverType: z.enum(['PAYBILL', 'BUY_GOODS']).default('PAYBILL'),
  accountReference: z.string().min(1, 'Account reference is required').trim(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  supplierId: z.coerce.number().positive().optional().nullable(),
  supplierInvoiceId: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const initiateB2CPayoutSchema = z.object({
  phoneNumber: z.string().regex(/^(?:254|\+254|0)?([17]\d{8})$/, 'Invalid Kenyan phone number'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  commandId: z.enum(['SalaryPayment', 'BusinessPayment', 'PromotionPayment']).default('BusinessPayment'),
  remarks: z.string().min(2, 'Payment remarks required').trim(),
});

export const reverseMpesaTxSchema = z.object({
  reason: z.string().min(3, 'Reversal reason is required'),
});

export type InitiateStkPushInput = z.infer<typeof initiateStkPushSchema>;
export type InitiateB2BPaymentInput = z.infer<typeof initiateB2BPaymentSchema>;
export type InitiateB2CPayoutInput = z.infer<typeof initiateB2CPayoutSchema>;