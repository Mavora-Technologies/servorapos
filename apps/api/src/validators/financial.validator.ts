import { z } from 'zod';

export const updateFinancialSettingsSchema = z.object({
  baseCurrency: z.string().trim().min(3).max(10).default('KES'),
  fiscalYearStartMonth: z.coerce.number().min(1).max(12).default(1),
  taxPin: z.string().trim().toUpperCase().optional().nullable(),
  isVatInclusive: z.boolean().default(true),
  vatRate: z.coerce.number().min(0).max(100).default(16),
  isCateringLevyEnabled: z.boolean().default(true),
  cateringLevyRate: z.coerce.number().min(0).max(100).default(2),
  isServiceChargeEnabled: z.boolean().default(false),
  serviceChargeRate: z.coerce.number().min(0).max(100).default(5),
  // eTIMS Parameters
  etimsEnvironment: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  autoFiscalizeOnPayment: z.boolean().default(true),
  etimsMiddleServerUrl: z.string().url().optional().nullable().or(z.literal('')),
  etimsDeviceSerial: z.string().trim().optional().nullable(),
  etimsBranchCode: z.string().trim().default('00'),
  allowOfflineFiscalSign: z.boolean().default(true),
  // HCM Compensation Rules
  tipDistributionModel: z.enum(['HOURS_WEIGHTED', 'EQUAL_SPLIT', 'ROLE_WEIGHTED']).default('HOURS_WEIGHTED'),
  defaultOvertimeMultiplier: z.coerce.number().min(1).max(5).default(1.5),
  holidayOvertimeMultiplier: z.coerce.number().min(1).max(5).default(2.0),
  standardWorkWeekHours: z.coerce.number().min(20).max(80).default(40),
  // Treasury Safe Drop
  maxDrawerCashThreshold: z.coerce.number().min(1000).default(50000),
  enableSafeDropAlerts: z.boolean().default(true),
});

export const createTaxCodeSchema = z.object({
  code: z.string().trim().min(2).max(20).toUpperCase(),
  name: z.string().trim().min(2).max(100),
  rate: z.coerce.number().min(0).max(100),
  statutoryCode: z.string().trim().toUpperCase().optional().nullable(),
});

export type UpdateFinancialSettingsInput = z.infer<typeof updateFinancialSettingsSchema>;
export type CreateTaxCodeInput = z.infer<typeof createTaxCodeSchema>;