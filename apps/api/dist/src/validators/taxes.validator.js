"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryFiscalizationSchema = exports.updateTaxSettingsSchema = exports.taxReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.taxReportQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().int().positive().optional(),
    periodMonth: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    periodYear: zod_1.z.coerce.number().int().min(2020).max(2035).optional(),
    status: zod_1.z.enum(['ALL', 'PENDING', 'FISCALIZED', 'FAILED']).default('ALL'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
exports.updateTaxSettingsSchema = zod_1.z.object({
    taxPin: zod_1.z.string().trim().regex(/^[A-Z]\d{9}[A-Z]$/, 'Valid KRA PIN required (e.g. P051234567X)').optional().nullable(),
    vatRate: zod_1.z.coerce.number().min(0).max(100).default(16.0),
    isVatInclusive: zod_1.z.boolean().default(true),
    isCateringLevyEnabled: zod_1.z.boolean().default(true),
    cateringLevyRate: zod_1.z.coerce.number().min(0).max(100).default(2.0),
    isServiceChargeEnabled: zod_1.z.boolean().default(false),
    serviceChargeRate: zod_1.z.coerce.number().min(0).max(100).default(5.0),
    etimsEnvironment: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    autoFiscalizeOnPayment: zod_1.z.boolean().default(true),
    etimsMiddleServerUrl: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal('')),
    etimsDeviceSerial: zod_1.z.string().trim().max(100).optional().nullable(),
    etimsBranchCode: zod_1.z.string().trim().max(20).default('00'),
    allowOfflineFiscalSign: zod_1.z.boolean().default(true),
});
exports.retryFiscalizationSchema = zod_1.z.object({
    fiscalInvoiceId: zod_1.z.coerce.number().int().positive('Fiscal Invoice ID is required'),
});
