"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultTemplateSchema = exports.updateReceiptTemplateSchema = exports.createReceiptTemplateSchema = void 0;
const zod_1 = require("zod");
exports.createReceiptTemplateSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    name: zod_1.z.string().trim().min(2, 'Template title must be at least 2 characters'),
    isDefault: zod_1.z.boolean().default(false),
    paperWidth: zod_1.z.enum(['80MM', '58MM', 'A4_INVOICE']).default('80MM'),
    fontScale: zod_1.z.enum(['COMPACT', 'NORMAL', 'LARGE']).default('NORMAL'),
    headerTitle: zod_1.z.string().trim().min(2, 'Receipt header business title is required'),
    headerSubtitle: zod_1.z.string().trim().optional().nullable(),
    showLogo: zod_1.z.boolean().default(true),
    showBranchAddress: zod_1.z.boolean().default(true),
    showTaxPin: zod_1.z.boolean().default(true),
    showContactPhone: zod_1.z.boolean().default(true),
    showContactEmail: zod_1.z.boolean().default(false),
    showCashierName: zod_1.z.boolean().default(true),
    showServerName: zod_1.z.boolean().default(true),
    showTableNumber: zod_1.z.boolean().default(true),
    showCustomerDetails: zod_1.z.boolean().default(true),
    showOrderType: zod_1.z.boolean().default(true),
    showItemSku: zod_1.z.boolean().default(false),
    showItemModifiers: zod_1.z.boolean().default(true),
    showKitchenNotes: zod_1.z.boolean().default(false),
    showTaxSummary: zod_1.z.boolean().default(true),
    showEtimsQrCode: zod_1.z.boolean().default(true),
    showFiscalDeviceSerial: zod_1.z.boolean().default(true),
    showPaymentBreakdown: zod_1.z.boolean().default(true),
    showChangeDue: zod_1.z.boolean().default(true),
    showTipPromptLine: zod_1.z.boolean().default(false),
    showLoyaltyPoints: zod_1.z.boolean().default(true),
    footerMessage: zod_1.z.string().optional().nullable(),
    returnPolicy: zod_1.z.string().optional().nullable(),
    wifiDetails: zod_1.z.string().optional().nullable(),
});
exports.updateReceiptTemplateSchema = exports.createReceiptTemplateSchema.partial();
exports.setDefaultTemplateSchema = zod_1.z.object({
    templateId: zod_1.z.coerce.number().positive('Template identifier is required'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
});
