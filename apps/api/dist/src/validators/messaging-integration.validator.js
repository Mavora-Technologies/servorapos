"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMessagingTemplateSchema = exports.createMessagingTemplateSchema = exports.testDispatchSchema = exports.updateMessagingIntegrationSchema = exports.createMessagingIntegrationSchema = void 0;
const zod_1 = require("zod");
exports.createMessagingIntegrationSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    channel: zod_1.z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'WEBHOOK']),
    provider: zod_1.z.enum([
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
    title: zod_1.z.string().trim().min(2, 'Integration title must be at least 2 characters'),
    environment: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    senderId: zod_1.z.string().trim().optional().nullable(),
    accountIdentifier: zod_1.z.string().trim().min(1, 'Account username, app SID, or client ID is required'),
    apiKey: zod_1.z.string().trim().min(1, 'API key or auth token is required'),
    apiSecret: zod_1.z.string().trim().optional().nullable(),
    webhookUrl: zod_1.z.string().url('Webhook URL must be a valid URI').optional().nullable().or(zod_1.z.literal('')),
    monthlyCreditCap: zod_1.z.coerce.number().min(0).default(0),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
    isDefault: zod_1.z.boolean().default(false),
});
exports.updateMessagingIntegrationSchema = exports.createMessagingIntegrationSchema.partial();
exports.testDispatchSchema = zod_1.z.object({
    integrationId: zod_1.z.coerce.number().positive('Integration identifier is required'),
    recipient: zod_1.z.string().trim().min(5, 'Valid recipient phone number or email is required'),
    message: zod_1.z.string().trim().min(1, 'Message body cannot be empty'),
});
exports.createMessagingTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, 'Template name is required'),
    triggerEvent: zod_1.z.enum([
        'SHIFT_SCHEDULED',
        'SHIFT_REMINDER',
        'LATE_CLOCK_IN',
        'HANDOVER_PENDING',
        'RECEIPT_DISPATCH',
        'SAFE_DROP_ALERT',
    ]),
    channel: zod_1.z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
    subject: zod_1.z.string().trim().optional().nullable(),
    bodyTemplate: zod_1.z.string().trim().min(5, 'Template body must be at least 5 characters'),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateMessagingTemplateSchema = exports.createMessagingTemplateSchema.partial();
