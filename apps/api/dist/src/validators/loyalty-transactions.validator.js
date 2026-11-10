"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLoyaltyTransactionsSchema = exports.loyaltyTransactionsQuerySchema = void 0;
const zod_1 = require("zod");
exports.loyaltyTransactionsQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    customerId: zod_1.z.coerce.number().positive().optional(),
    entryType: zod_1.z.enum(['ACCRUAL_PURCHASE', 'REDEMPTION_VOUCHER', 'MANUAL_ADJUSTMENT', 'EXPIRY_DEDUCTION', 'TIER_BONUS', 'ALL']).default('ALL'),
    channel: zod_1.z.string().trim().optional(),
    startDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    endDate: zod_1.z
        .string()
        .datetime({ offset: true })
        .or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
        .optional(),
    sortBy: zod_1.z.enum(['CREATED_AT', 'POINTS', 'VALUE']).default('CREATED_AT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    search: zod_1.z.string().trim().optional(),
});
exports.exportLoyaltyTransactionsSchema = exports.loyaltyTransactionsQuerySchema.extend({
    exportType: zod_1.z.enum(['LEDGER_AUDIT', 'ACCRUAL_SUMMARY', 'REDEMPTION_LOG']).default('LEDGER_AUDIT'),
});
