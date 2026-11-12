import { z } from 'zod';

export const taxReportQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  periodType: z.enum(['MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
  periodMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodQuarter: z.coerce.number().int().min(1).max(4).optional(),
  periodYear: z.coerce.number().int().min(2015).max(2050).optional(),
  status: z.enum(['ALL', 'PENDING', 'FISCALIZED', 'FAILED']).default('ALL'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateTaxSettingsSchema = z.object({
  taxPin: z
    .string()
    .trim()
    .regex(/^[A-Z]\d{9}[A-Z]$/, 'Valid KRA PIN required (e.g. P051234567X)')
    .optional()
    .nullable(),
  vatRate: z.coerce.number().min(0).max(100).default(16.0),
  isVatInclusive: z.boolean().default(true),
  isCateringLevyEnabled: z.boolean().default(true),
  cateringLevyRate: z.coerce.number().min(0).max(100).default(2.0),
  isServiceChargeEnabled: z.boolean().default(false),
  serviceChargeRate: z.coerce.number().min(0).max(100).default(5.0),
  etimsEnvironment: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  autoFiscalizeOnPayment: z.boolean().default(true),
  etimsMiddleServerUrl: z.string().url().optional().nullable().or(z.literal('')),
  etimsDeviceSerial: z.string().trim().max(100).optional().nullable(),
  etimsBranchCode: z.string().trim().max(20).default('00'),
  allowOfflineFiscalSign: z.boolean().default(true),
});

export const createTaxCodeSchema = z.object({
  code: z.string().trim().min(2, 'Tax code is required').max(30).toUpperCase(),
  name: z.string().trim().min(2, 'Classification name is required').max(100),
  rate: z.coerce.number().min(0).max(100),
  statutoryCode: z.string().trim().max(20).optional().nullable(),
});

export const retryFiscalizationSchema = z.object({
  fiscalInvoiceId: z.coerce.number().int().positive('Fiscal Invoice ID is required'),
});

export type TaxReportQuery = z.infer<typeof taxReportQuerySchema>;
export type UpdateTaxSettingsInput = z.infer<typeof updateTaxSettingsSchema>;
export type CreateTaxCodeInput = z.infer<typeof createTaxCodeSchema>;
export type RetryFiscalizationInput = z.infer<typeof retryFiscalizationSchema>;