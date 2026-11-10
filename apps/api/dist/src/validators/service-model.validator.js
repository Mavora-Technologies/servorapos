"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleServiceModelStatusSchema = exports.updateServiceModelSchema = exports.createServiceModelSchema = void 0;
const zod_1 = require("zod");
exports.createServiceModelSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    name: zod_1.z.string().trim().min(2, 'Model name must be at least 2 characters'),
    type: zod_1.z.enum(['DINE_IN', 'QUICK_SERVICE', 'BAR_TAB', 'TAKEAWAY', 'DELIVERY', 'DRIVE_THRU']),
    description: zod_1.z.string().optional().nullable(),
    requiresTable: zod_1.z.boolean().default(true),
    payBeforeOrder: zod_1.z.boolean().default(false),
    promptGuestCount: zod_1.z.boolean().default(true),
    allowSplitChecks: zod_1.z.boolean().default(true),
    allowTableTransfers: zod_1.z.boolean().default(true),
    autoSendToKitchen: zod_1.z.boolean().default(false),
    enableCoursePacing: zod_1.z.boolean().default(false),
    requireSeatNumbering: zod_1.z.boolean().default(false),
    autoApplyServiceCharge: zod_1.z.boolean().default(false),
    serviceChargePercent: zod_1.z.coerce.number().min(0).max(100).default(0),
    packingChargeAmount: zod_1.z.coerce.number().min(0).default(0),
    preAuthCardRequired: zod_1.z.boolean().default(false),
    maxTabCreditLimit: zod_1.z.coerce.number().min(0).default(0),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateServiceModelSchema = exports.createServiceModelSchema.partial();
exports.toggleServiceModelStatusSchema = zod_1.z.object({
    isActive: zod_1.z.boolean(),
});
