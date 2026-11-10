"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTaxCodeSchema = exports.updateFinancialSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateFinancialSettingsSchema = zod_1.z.object({
    baseCurrency: zod_1.z.string().trim().min(3).max(10).default('KES'),
    fiscalYearStartMonth: zod_1.z.coerce.number().min(1).max(12).default(1),
    taxPin: zod_1.z.string().trim().toUpperCase().optional().nullable(),
    isVatInclusive: zod_1.z.boolean().default(true),
    vatRate: zod_1.z.coerce.number().min(0).max(100).default(16),
    isCateringLevyEnabled: zod_1.z.boolean().default(true),
    cateringLevyRate: zod_1.z.coerce.number().min(0).max(100).default(2),
    isServiceChargeEnabled: zod_1.z.boolean().default(false),
    serviceChargeRate: zod_1.z.coerce.number().min(0).max(100).default(5),
    // eTIMS Parameters
    etimsEnvironment: zod_1.z.enum(['SANDBOX', 'PRODUCTION']).default('SANDBOX'),
    autoFiscalizeOnPayment: zod_1.z.boolean().default(true),
    etimsMiddleServerUrl: zod_1.z.string().url().optional().nullable().or(zod_1.z.literal('')),
    etimsDeviceSerial: zod_1.z.string().trim().optional().nullable(),
    etimsBranchCode: zod_1.z.string().trim().default('00'),
    allowOfflineFiscalSign: zod_1.z.boolean().default(true),
    // HCM Compensation Rules
    tipDistributionModel: zod_1.z.enum(['HOURS_WEIGHTED', 'EQUAL_SPLIT', 'ROLE_WEIGHTED']).default('HOURS_WEIGHTED'),
    defaultOvertimeMultiplier: zod_1.z.coerce.number().min(1).max(5).default(1.5),
    holidayOvertimeMultiplier: zod_1.z.coerce.number().min(1).max(5).default(2.0),
    standardWorkWeekHours: zod_1.z.coerce.number().min(20).max(80).default(40),
    // Treasury Safe Drop
    maxDrawerCashThreshold: zod_1.z.coerce.number().min(1000).default(50000),
    enableSafeDropAlerts: zod_1.z.boolean().default(true),
});
exports.createTaxCodeSchema = zod_1.z.object({
    code: zod_1.z.string().trim().min(2).max(20).toUpperCase(),
    name: zod_1.z.string().trim().min(2).max(100),
    rate: zod_1.z.coerce.number().min(0).max(100),
    statutoryCode: zod_1.z.string().trim().toUpperCase().optional().nullable(),
});
