import { z } from 'zod';

export const campaignObjectiveEnum = z.enum([
  'REVENUE_GROWTH',
  'CUSTOMER_RETENTION',
  'LOYALTY_ACCRUAL',
  'BRAND_AWARENESS',
]);

export const campaignChannelEnum = z.enum([
  'SMS',
  'EMAIL',
  'PUSH_NOTIFICATION',
  'OMNICHANNEL',
]);

export const campaignSegmentEnum = z.enum([
  'ALL_CUSTOMERS',
  'VIP_MEMBERS',
  'LAPSED_CUSTOMERS',
  'HIGH_SPENDERS',
  'CORPORATE',
]);

export const campaignStatusEnum = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'COMPLETED',
  'PAUSED',
]);

export const createMarketingCampaignSchema = z.object({
  name: z.string().trim().min(3, 'Campaign name must be at least 3 characters').max(255),
  objective: campaignObjectiveEnum.default('REVENUE_GROWTH'),
  channel: campaignChannelEnum.default('SMS'),
  targetSegment: campaignSegmentEnum.default('ALL_CUSTOMERS'),
  status: campaignStatusEnum.default('DRAFT'),
  budgetKes: z.coerce.number().min(0, 'Budget must be non-negative').default(0),
  templateId: z.coerce.number().positive().optional().nullable(),
  promoCode: z.string().trim().max(50).optional().nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
  discountValue: z.coerce.number().min(0).optional().nullable(),
  maxUsageCount: z.coerce.number().int().min(1).default(100),
  messageContent: z.string().trim().min(5, 'Message body is required'),
  branchId: z.coerce.number().positive().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const updateMarketingCampaignSchema = createMarketingCampaignSchema.partial();

export const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  channel: z.string().trim().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['CREATED_AT', 'NAME', 'BUDGET', 'REVENUE', 'CONVERSIONS']).default('CREATED_AT'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export const createTemplateSchema = z.object({
  name: z.string().trim().min(3, 'Template title required'),
  channel: campaignChannelEnum.default('SMS'),
  objective: campaignObjectiveEnum.default('REVENUE_GROWTH'),
  subjectLine: z.string().trim().max(255).optional().nullable(),
  bodyTemplate: z.string().trim().min(5, 'Template body is required'),
  suggestedPromoPrefix: z.string().trim().max(20).optional().nullable(),
  defaultDiscountPercentage: z.coerce.number().int().min(0).max(100).optional().nullable(),
});

export type CreateMarketingCampaignInput = z.infer<typeof createMarketingCampaignSchema>;
export type UpdateMarketingCampaignInput = z.infer<typeof updateMarketingCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;