import { z } from 'zod';

export const createReceiptTemplateSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  name: z.string().trim().min(2, 'Template title must be at least 2 characters'),
  isDefault: z.boolean().default(false),
  paperWidth: z.enum(['80MM', '58MM', 'A4_INVOICE']).default('80MM'),
  fontScale: z.enum(['COMPACT', 'NORMAL', 'LARGE']).default('NORMAL'),
  headerTitle: z.string().trim().min(2, 'Receipt header business title is required'),
  headerSubtitle: z.string().trim().optional().nullable(),
  showLogo: z.boolean().default(true),
  showBranchAddress: z.boolean().default(true),
  showTaxPin: z.boolean().default(true),
  showContactPhone: z.boolean().default(true),
  showContactEmail: z.boolean().default(false),
  showCashierName: z.boolean().default(true),
  showServerName: z.boolean().default(true),
  showTableNumber: z.boolean().default(true),
  showCustomerDetails: z.boolean().default(true),
  showOrderType: z.boolean().default(true),
  showItemSku: z.boolean().default(false),
  showItemModifiers: z.boolean().default(true),
  showKitchenNotes: z.boolean().default(false),
  showTaxSummary: z.boolean().default(true),
  showEtimsQrCode: z.boolean().default(true),
  showFiscalDeviceSerial: z.boolean().default(true),
  showPaymentBreakdown: z.boolean().default(true),
  showChangeDue: z.boolean().default(true),
  showTipPromptLine: z.boolean().default(false),
  showLoyaltyPoints: z.boolean().default(true),
  footerMessage: z.string().optional().nullable(),
  returnPolicy: z.string().optional().nullable(),
  wifiDetails: z.string().optional().nullable(),
});

export const updateReceiptTemplateSchema = createReceiptTemplateSchema.partial();

export const setDefaultTemplateSchema = z.object({
  templateId: z.coerce.number().positive('Template identifier is required'),
  branchId: z.coerce.number().positive().optional().nullable(),
});

export type CreateReceiptTemplateInput = z.infer<typeof createReceiptTemplateSchema>;
export type UpdateReceiptTemplateInput = z.infer<typeof updateReceiptTemplateSchema>;