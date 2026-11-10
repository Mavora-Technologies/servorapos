"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTemplatesQuerySchema = exports.updateMarketingTemplateSchema = exports.createMarketingTemplateSchema = exports.templateObjectiveEnum = exports.templateChannelEnum = void 0;
const zod_1 = require("zod");
exports.templateChannelEnum = zod_1.z.enum(['SMS', 'EMAIL', 'PUSH_NOTIFICATION', 'WHATSAPP']);
exports.templateObjectiveEnum = zod_1.z.enum([
    'REVENUE_GROWTH',
    'CUSTOMER_RETENTION',
    'LOYALTY_ACCRUAL',
    'BRAND_AWARENESS',
    'SERVICE_UPDATE',
]);
exports.createMarketingTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Template title must be at least 3 characters').max(150),
    channel: exports.templateChannelEnum.default('SMS'),
    objective: exports.templateObjectiveEnum.default('REVENUE_GROWTH'),
    subjectLine: zod_1.z.string().trim().max(255).optional().nullable(),
    bodyTemplate: zod_1.z.string().trim().min(5, 'Template body is required'),
    suggestedPromoPrefix: zod_1.z.string().trim().max(20).optional().nullable(),
    defaultDiscountPercentage: zod_1.z.coerce.number().int().min(0).max(100).optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateMarketingTemplateSchema = exports.createMarketingTemplateSchema.partial();
exports.listTemplatesQuerySchema = zod_1.z.object({
    channel: zod_1.z.string().trim().optional(),
    objective: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    isActive: zod_1.z.enum(['ALL', 'TRUE', 'FALSE']).default('TRUE'),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
