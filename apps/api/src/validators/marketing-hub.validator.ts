import { z } from 'zod';

export const marketingOverviewQuerySchema = z.object({
  branchId: z.coerce.number().positive().optional(),
  timeRange: z.enum(['7D', '30D', '90D', 'YTD', 'ALL']).default('30D'),
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
});

export const quickCampaignLaunchSchema = z.object({
  name: z.string().trim().min(3, 'Campaign name must be at least 3 characters'),
  channel: z.enum(['SMS', 'EMAIL', 'PUSH_NOTIFICATION', 'OMNICHANNEL']).default('SMS'),
  targetSegment: z.enum(['ALL_CUSTOMERS', 'VIP_MEMBERS', 'LAPSED_CUSTOMERS', 'HIGH_SPENDERS', 'CORPORATE']).default('ALL_CUSTOMERS'),
  templateId: z.coerce.number().positive().optional().nullable(),
  budgetKes: z.coerce.number().min(0).default(0),
  messageContent: z.string().trim().min(5, 'Message body is required'),
});

export type MarketingOverviewQuery = z.infer<typeof marketingOverviewQuerySchema>;
export type QuickCampaignLaunchInput = z.infer<typeof quickCampaignLaunchSchema>;