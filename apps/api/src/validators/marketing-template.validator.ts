import { z } from 'zod';

export const templateChannelEnum = z.enum(['SMS', 'EMAIL', 'PUSH_NOTIFICATION', 'WHATSAPP']);

export const templateObjectiveEnum = z.enum([
  'REVENUE_GROWTH',
  'CUSTOMER_RETENTION',
  'LOYALTY_ACCRUAL',
  'BRAND_AWARENESS',
  'SERVICE_UPDATE',
]);

export const createMarketingTemplateSchema = z.object({
  name: z.string().trim().min(3, 'Template title must be at least 3 characters').max(150),
  channel: templateChannelEnum.default('SMS'),
  objective: templateObjectiveEnum.default('REVENUE_GROWTH'),
  subjectLine: z.string().trim().max(255).optional().nullable(),
  bodyTemplate: z.string().trim().min(5, 'Template body is required'),
  suggestedPromoPrefix: z.string().trim().max(20).optional().nullable(),
  defaultDiscountPercentage: z.coerce.number().int().min(0).max(100).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateMarketingTemplateSchema = createMarketingTemplateSchema.partial();

export const listTemplatesQuerySchema = z.object({
  channel: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  search: z.string().trim().optional(),
  isActive: z.enum(['ALL', 'TRUE', 'FALSE']).default('TRUE'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateMarketingTemplateInput = z.infer<typeof createMarketingTemplateSchema>;
export type UpdateMarketingTemplateInput = z.infer<typeof updateMarketingTemplateSchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;