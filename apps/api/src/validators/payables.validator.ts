import { z } from 'zod';

export const listPayablesQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  status: z.enum(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'DISPUTED']).default('ALL'),
  agingBucket: z.enum(['ALL', 'CURRENT', 'PAST_DUE_30', 'PAST_DUE_60', 'PAST_DUE_90_PLUS']).default('ALL'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const recordPayableDisbursementSchema = z.object({
  invoiceId: z.coerce.number().int().positive('Supplier invoice ID is required'),
  paymentAmount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH_DRAWER']),
  clearingAccount: z.string().trim().min(2, 'Clearing account must be specified'), // e.g. "KCB Operating Acc", "Safaricom B2B Paybill"
  transactionReference: z.string().trim().min(3, 'Transaction or reference code is required').max(100),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createSupplierInvoiceSchema = z.object({
  branchId: z.coerce.number().int().positive().optional().nullable(),
  supplierId: z.coerce.number().int().positive('Supplier is required'),
  purchaseOrderId: z.coerce.number().int().positive().optional().nullable(),
  goodsReceivedNoteId: z.coerce.number().int().positive().optional().nullable(),
  invoiceNumber: z.string().trim().min(2, 'Vendor invoice number is required').max(100),
  subtotal: z.coerce.number().positive('Subtotal must be greater than zero'),
  taxAmount: z.coerce.number().min(0).default(0),
  invoiceDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type ListPayablesQuery = z.infer<typeof listPayablesQuerySchema>;
export type RecordPayableDisbursementInput = z.infer<typeof recordPayableDisbursementSchema>;
export type CreateSupplierInvoiceInput = z.infer<typeof createSupplierInvoiceSchema>;