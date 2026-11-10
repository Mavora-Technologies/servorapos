"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testHandshakeSchema = exports.updatePaymentIntegrationSchema = exports.createPaymentIntegrationSchema = exports.paymentProviderEnum = void 0;
const zod_1 = require("zod");
exports.paymentProviderEnum = zod_1.z.enum([
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
exports.createPaymentIntegrationSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    provider: exports.paymentProviderEnum,
    title: zod_1.z.string().trim().min(2, 'Integration title must be at least 2 characters'),
    environment: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    merchantIdentifier: zod_1.z.string().trim().min(1, 'Merchant identifier, shortcode, account, or till ID is required'),
    apiKey: zod_1.z.string().trim().min(1, 'Consumer Key or Public API key is required'),
    apiSecret: zod_1.z.string().trim().min(1, 'Consumer Secret or Secret API key is required'),
    passKey: zod_1.z.string().trim().optional().nullable(),
    webhookSecret: zod_1.z.string().trim().optional().nullable(),
    callbackUrl: zod_1.z.string().url('Callback URL must be a valid HTTPS URI').optional().nullable().or(zod_1.z.literal('')),
    supportedCurrencies: zod_1.z.array(zod_1.z.string().min(3).max(5)).min(1, 'Select at least one supported currency').default(['KES']),
    autoReconcile: zod_1.z.boolean().default(true),
    settlementAccountCode: zod_1.z.string().trim().optional().nullable(),
    surchargePercent: zod_1.z.coerce.number().min(0).max(100).default(0),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
    isDefault: zod_1.z.boolean().default(false),
});
exports.updatePaymentIntegrationSchema = exports.createPaymentIntegrationSchema.partial();
exports.testHandshakeSchema = zod_1.z.object({
    integrationId: zod_1.z.coerce.number().positive('Integration identifier is required'),
});
