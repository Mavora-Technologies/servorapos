"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateSchema = exports.listCampaignsQuerySchema = exports.updateMarketingCampaignSchema = exports.createMarketingCampaignSchema = exports.campaignStatusEnum = exports.campaignSegmentEnum = exports.campaignChannelEnum = exports.campaignObjectiveEnum = void 0;
const zod_1 = require("zod");
exports.campaignObjectiveEnum = zod_1.z.enum([
    'REVENUE_GROWTH',
    'CUSTOMER_RETENTION',
    'LOYALTY_ACCRUAL',
    'BRAND_AWARENESS',
]);
exports.campaignChannelEnum = zod_1.z.enum([
    'SMS',
    'EMAIL',
    'PUSH_NOTIFICATION',
    'OMNICHANNEL',
]);
exports.campaignSegmentEnum = zod_1.z.enum([
    'ALL_CUSTOMERS',
    'VIP_MEMBERS',
    'LAPSED_CUSTOMERS',
    'HIGH_SPENDERS',
    'CORPORATE',
]);
exports.campaignStatusEnum = zod_1.z.enum([
    'DRAFT',
    'SCHEDULED',
    'ACTIVE',
    'COMPLETED',
    'PAUSED',
]);
exports.createMarketingCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Campaign name must be at least 3 characters').max(255),
    objective: exports.campaignObjectiveEnum.default('REVENUE_GROWTH'),
    channel: exports.campaignChannelEnum.default('SMS'),
    targetSegment: exports.campaignSegmentEnum.default('ALL_CUSTOMERS'),
    status: exports.campaignStatusEnum.default('DRAFT'),
    budgetKes: zod_1.z.coerce.number().min(0, 'Budget must be non-negative').default(0),
    templateId: zod_1.z.coerce.number().positive().optional().nullable(),
    promoCode: zod_1.z.string().trim().max(50).optional().nullable(),
    discountType: zod_1.z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
    discountValue: zod_1.z.coerce.number().min(0).optional().nullable(),
    maxUsageCount: zod_1.z.coerce.number().int().min(1).default(100),
    messageContent: zod_1.z.string().trim().min(5, 'Message body is required'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    startDate: zod_1.z.string().optional().nullable(),
    endDate: zod_1.z.string().optional().nullable(),
});
exports.updateMarketingCampaignSchema = exports.createMarketingCampaignSchema.partial();
exports.listCampaignsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    channel: zod_1.z.string().trim().optional(),
    status: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    sortBy: zod_1.z.enum(['CREATED_AT', 'NAME', 'BUDGET', 'REVENUE', 'CONVERSIONS']).default('CREATED_AT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
});
exports.createTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Template title required'),
    channel: exports.campaignChannelEnum.default('SMS'),
    objective: exports.campaignObjectiveEnum.default('REVENUE_GROWTH'),
    subjectLine: zod_1.z.string().trim().max(255).optional().nullable(),
    bodyTemplate: zod_1.z.string().trim().min(5, 'Template body is required'),
    suggestedPromoPrefix: zod_1.z.string().trim().max(20).optional().nullable(),
    defaultDiscountPercentage: zod_1.z.coerce.number().int().min(0).max(100).optional().nullable(),
});
