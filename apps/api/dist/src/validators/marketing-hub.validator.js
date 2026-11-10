"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickCampaignLaunchSchema = exports.marketingOverviewQuerySchema = void 0;
const zod_1 = require("zod");
exports.marketingOverviewQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    timeRange: zod_1.z.enum(['7D', '30D', '90D', 'YTD', 'ALL']).default('30D'),
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
});
exports.quickCampaignLaunchSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Campaign name must be at least 3 characters'),
    channel: zod_1.z.enum(['SMS', 'EMAIL', 'PUSH_NOTIFICATION', 'OMNICHANNEL']).default('SMS'),
    targetSegment: zod_1.z.enum(['ALL_CUSTOMERS', 'VIP_MEMBERS', 'LAPSED_CUSTOMERS', 'HIGH_SPENDERS', 'CORPORATE']).default('ALL_CUSTOMERS'),
    templateId: zod_1.z.coerce.number().positive().optional().nullable(),
    budgetKes: zod_1.z.coerce.number().min(0).default(0),
    messageContent: zod_1.z.string().trim().min(5, 'Message body is required'),
});
