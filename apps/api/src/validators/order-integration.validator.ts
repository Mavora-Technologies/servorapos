import { z } from 'zod';

export const createOrderIntegrationSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  channel: z.enum([
    'GLOVO',
    'UBER_EATS',
    'BOLT_FOOD',
    'DOORDASH',
    'SHOPIFY',
    'WOOCOMMERCE',
    'CUSTOM_WEBHOOK',
  ]),
  title: z.string().trim().min(2, 'Integration title must be at least 2 characters'),
  environment: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  storeIdentifier: z.string().trim().min(1, 'Store ID or Aggregator Location UUID is required'),
  apiKey: z.string().trim().min(1, 'API Key or Access Token is required'),
  apiSecret: z.string().trim().optional().nullable(),
  webhookSecret: z.string().trim().optional().nullable(),
  callbackUrl: z.string().url('Callback URL must be a valid HTTPS URI').optional().nullable().or(z.literal('')),
  autoAcceptOrders: z.boolean().default(false),
  autoSendToKitchen: z.boolean().default(true),
  priceMarkupPercent: z.coerce.number().min(0).max(100).default(0),
  defaultPrepTimeMinutes: z.coerce.number().min(5).max(180).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PAUSED', 'ERROR']).default('ACTIVE'),
  isDefault: z.boolean().default(false),
});

export const updateOrderIntegrationSchema = createOrderIntegrationSchema.partial();

export const testSyncSchema = z.object({
  integrationId: z.coerce.number().positive('Integration identifier is required'),
});

export type CreateOrderIntegrationInput = z.infer<typeof createOrderIntegrationSchema>;
export type UpdateOrderIntegrationInput = z.infer<typeof updateOrderIntegrationSchema>;