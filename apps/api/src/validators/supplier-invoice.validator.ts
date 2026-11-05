import { z } from 'zod';

export const createSupplierInvoiceItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive(),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitPrice: z.coerce.number().min(0, 'Price must be non-negative'),
  taxRate: z.coerce.number().min(0).default(16.0),
  notes: z.string().optional().nullable(),
});

export const createSupplierInvoiceSchema = z.object({
  supplierId: z.coerce.number().positive('Supplier selection is required'),
  purchaseOrderId: z.coerce.number().positive().optional().nullable(),
  goodsReceivedNoteId: z.coerce.number().positive().optional().nullable(),
  invoiceNumber: z.string().min(2, 'Vendor Invoice # is required').trim(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().min(1, 'Payment Due Date is required'),
  notes: z.string().optional().nullable(),
  items: z.array(createSupplierInvoiceItemSchema).min(1, 'At least one line item is required'),
});

export const recordInvoicePaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['MPESA_B2B', 'BANK_TRANSFER', 'CHEQUE', 'CASH']).default('MPESA_B2B'),
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSupplierInvoiceInput = z.infer<typeof createSupplierInvoiceSchema>;