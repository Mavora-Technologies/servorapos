"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSyncSchema = exports.updateOrderIntegrationSchema = exports.createOrderIntegrationSchema = void 0;
const zod_1 = require("zod");
exports.createOrderIntegrationSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    channel: zod_1.z.enum([
        'GLOVO',
        'UBER_EATS',
        'BOLT_FOOD',
        'DOORDASH',
        'SHOPIFY',
        'WOOCOMMERCE',
        'CUSTOM_WEBHOOK',
    ]),
    title: zod_1.z.string().trim().min(2, 'Integration title must be at least 2 characters'),
    environment: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    storeIdentifier: zod_1.z.string().trim().min(1, 'Store ID or Aggregator Location UUID is required'),
    apiKey: zod_1.z.string().trim().min(1, 'API Key or Access Token is required'),
    apiSecret: zod_1.z.string().trim().optional().nullable(),
    webhookSecret: zod_1.z.string().trim().optional().nullable(),
    callbackUrl: zod_1.z.string().url('Callback URL must be a valid HTTPS URI').optional().nullable().or(zod_1.z.literal('')),
    autoAcceptOrders: zod_1.z.boolean().default(false),
    autoSendToKitchen: zod_1.z.boolean().default(true),
    priceMarkupPercent: zod_1.z.coerce.number().min(0).max(100).default(0),
    defaultPrepTimeMinutes: zod_1.z.coerce.number().min(5).max(180).default(20),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'PAUSED', 'ERROR']).default('ACTIVE'),
    isDefault: zod_1.z.boolean().default(false),
});
exports.updateOrderIntegrationSchema = exports.createOrderIntegrationSchema.partial();
exports.testSyncSchema = zod_1.z.object({
    integrationId: zod_1.z.coerce.number().positive('Integration identifier is required'),
});
