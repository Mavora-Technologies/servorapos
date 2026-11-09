import { z } from 'zod';

export const createMessagingIntegrationSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'WEBHOOK']),
  provider: z.enum([
    'AFRICAS_TALKING',
    'TWILIO',
    'ADVANTA_SMS',
    'SAFARICOM_BULK_SMS',
    'INFOBIP',
    'SENDGRID',
    'RESEND',
    'AWS_SES',
    'CUSTOM_WEBHOOK',
  ]),
  title: z.string().trim().min(2, 'Integration title must be at least 2 characters'),
  environment: z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
  senderId: z.string().trim().optional().nullable(),
  accountIdentifier: z.string().trim().min(1, 'Account username, app SID, or client ID is required'),
  apiKey: z.string().trim().min(1, 'API key or auth token is required'),
  apiSecret: z.string().trim().optional().nullable(),
  webhookUrl: z.string().url('Webhook URL must be a valid URI').optional().nullable().or(z.literal('')),
  monthlyCreditCap: z.coerce.number().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
  isDefault: z.boolean().default(false),
});

export const updateMessagingIntegrationSchema = createMessagingIntegrationSchema.partial();

export const testDispatchSchema = z.object({
  integrationId: z.coerce.number().positive('Integration identifier is required'),
  recipient: z.string().trim().min(5, 'Valid recipient phone number or email is required'),
  message: z.string().trim().min(1, 'Message body cannot be empty'),
});

export const createMessagingTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Template name is required'),
  triggerEvent: z.enum([
    'SHIFT_SCHEDULED',
    'SHIFT_REMINDER',
    'LATE_CLOCK_IN',
    'HANDOVER_PENDING',
    'RECEIPT_DISPATCH',
    'SAFE_DROP_ALERT',
  ]),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
  subject: z.string().trim().optional().nullable(),
  bodyTemplate: z.string().trim().min(5, 'Template body must be at least 5 characters'),
  isActive: z.boolean().default(true),
});

export const updateMessagingTemplateSchema = createMessagingTemplateSchema.partial();

export type CreateMessagingIntegrationInput = z.infer<typeof createMessagingIntegrationSchema>;
export type UpdateMessagingIntegrationInput = z.infer<typeof updateMessagingIntegrationSchema>;
export type TestDispatchInput = z.infer<typeof testDispatchSchema>;
export type CreateMessagingTemplateInput = z.infer<typeof createMessagingTemplateSchema>;
export type UpdateMessagingTemplateInput = z.infer<typeof updateMessagingTemplateSchema>;