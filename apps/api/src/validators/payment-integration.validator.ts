import { z } from 'zod';

export const paymentProviderEnum = z.enum([
  // Mobile Money & Regional Aggregators
  'MPESA_DARAJA',
  'PESAPAL',
  'DPO_PAY',
  'FLUTTERWAVE',
  // Kenyan Commercial Banks (Direct B2B / Open Banking APIs)
  'KCB_BUNI',
  'EQUITY_JENGA',
  'COOP_BANK',
  'STANBIC_BANK',
  'NCBA_BANK',
  'ABSA_BANK',
  'IM_BANK',
  // Global & Card Terminals
  'STRIPE',
  'ADYEN',
  'MANUAL_PDQ',
]);

export const createPaymentIntegrationSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  provider: paymentProviderEnum,
  title: z.string().trim().min(2, 'Integration title must be at least 2 characters'),
  environment: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  merchantIdentifier: z.string().trim().min(1, 'Merchant identifier, shortcode, account, or till ID is required'),
  apiKey: z.string().trim().min(1, 'Consumer Key or Public API key is required'),
  apiSecret: z.string().trim().min(1, 'Consumer Secret or Secret API key is required'),
  passKey: z.string().trim().optional().nullable(),
  webhookSecret: z.string().trim().optional().nullable(),
  callbackUrl: z.string().url('Callback URL must be a valid HTTPS URI').optional().nullable().or(z.literal('')),
  supportedCurrencies: z.array(z.string().min(3).max(5)).min(1, 'Select at least one supported currency').default(['KES']),
  autoReconcile: z.boolean().default(true),
  settlementAccountCode: z.string().trim().optional().nullable(),
  surchargePercent: z.coerce.number().min(0).max(100).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  isDefault: z.boolean().default(false),
});

export const updatePaymentIntegrationSchema = createPaymentIntegrationSchema.partial();

export const testHandshakeSchema = z.object({
  integrationId: z.coerce.number().positive('Integration identifier is required'),
});

export type CreatePaymentIntegrationInput = z.infer<typeof createPaymentIntegrationSchema>;
export type UpdatePaymentIntegrationInput = z.infer<typeof updatePaymentIntegrationSchema>;