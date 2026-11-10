import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  marketingCampaigns,
  marketingTemplates,
  promotionalDiscounts,
  customers,
  orders,
  customerLoyaltyProfiles,
} from '../config/schema';
import { MarketingOverviewQuery } from '../validators/marketing-hub.validator';

const parseTimeRange = (range: string, customStart?: string, customEnd?: string) => {
  if (customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (range) {
    case '7D':
      start.setDate(end.getDate() - 7);
      break;
    case '90D':
      start.setDate(end.getDate() - 90);
      break;
    case 'YTD':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'ALL':
      start.setFullYear(2020, 0, 1);
      break;
    case '30D':
    default:
      start.setDate(end.getDate() - 30);
      break;
  }
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

export const getMarketingHubExecutiveMetrics = async (tenantId: number, query: MarketingOverviewQuery) => {
  const { start, end } = parseTimeRange(query.timeRange, query.startDate, query.endDate);

  const baseConditions = [
    eq(marketingCampaigns.tenantId, tenantId),
    gte(marketingCampaigns.createdAt, start),
    lte(marketingCampaigns.createdAt, end),
    query.branchId ? eq(marketingCampaigns.branchId, query.branchId) : undefined,
  ].filter(Boolean);

  // 1. High-Level Performance Aggregate
  const [campaignStats] = await db
    .select({
      totalCampaigns: sql<number>`count(*)`,
      activeCampaigns: sql<number>`count(case when ${marketingCampaigns.status} in ('ACTIVE', 'SCHEDULED') then 1 end)`,
      totalBudget: sql<number>`coalesce(sum(${marketingCampaigns.budgetKes}), 0)::numeric`,
      attributedRevenue: sql<number>`coalesce(sum(${marketingCampaigns.attributedRevenueKes}), 0)::numeric`,
      totalDispatched: sql<number>`coalesce(sum(${marketingCampaigns.recipientsCount}), 0)::numeric`,
      totalDelivered: sql<number>`coalesce(sum(${marketingCampaigns.deliveredCount}), 0)::numeric`,
      totalConverted: sql<number>`coalesce(sum(${marketingCampaigns.convertedCount}), 0)::numeric`,
    })
    .from(marketingCampaigns)
    .where(and(...baseConditions));

  const totalBudget = Number(campaignStats?.totalBudget || 0);
  const attributedRevenue = Number(campaignStats?.attributedRevenue || 0);
  const totalDelivered = Number(campaignStats?.totalDelivered || 0);
  const totalConverted = Number(campaignStats?.totalConverted || 0);

  const roas = totalBudget > 0 ? Math.round((attributedRevenue / totalBudget) * 10) / 10 : 0;
  const avgConversionRate = totalDelivered > 0 ? Math.round((totalConverted / totalDelivered) * 1000) / 10 : 0;

  // 2. Channel Distribution (SMS vs. Email vs. Push vs. Omnichannel)
  const channelBreakdown = await db
    .select({
      channel: marketingCampaigns.channel,
      campaignCount: sql<number>`count(*)`,
      attributedRevenue: sql<number>`coalesce(sum(${marketingCampaigns.attributedRevenueKes}), 0)::numeric`,
      convertedCount: sql<number>`coalesce(sum(${marketingCampaigns.convertedCount}), 0)::numeric`,
    })
    .from(marketingCampaigns)
    .where(and(...baseConditions))
    .groupBy(marketingCampaigns.channel)
    .orderBy(desc(sql`sum(${marketingCampaigns.attributedRevenueKes})`));

  // 3. Customer Audience Segmentation Landscape
  const [segmentStats] = await db
    .select({
      totalAudience: sql<number>`count(*)`,
      vipMembers: sql<number>`count(case when ${customers.loyaltyPoints} >= 500 then 1 end)`,
      highSpenders: sql<number>`count(case when ${customers.totalSpent} >= 10000 then 1 end)`,
      corporateAccounts: sql<number>`count(case when ${customers.customerType} = 'CORPORATE' then 1 end)`,
      lapsedCustomers: sql<number>`count(case when ${customers.ordersCount} > 0 and ${customers.updatedAt} < now() - interval '45 days' then 1 end)`,
    })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.isActive, true)));

  // 4. Active Financial Promo Code Liabilities
  const activePromos = await db
    .select({
      id: promotionalDiscounts.id,
      code: promotionalDiscounts.code,
      discountType: promotionalDiscounts.discountType,
      discountValue: promotionalDiscounts.discountValue,
      maxUsageCount: promotionalDiscounts.maxUsageCount,
      currentUsageCount: promotionalDiscounts.currentUsageCount,
      expiresAt: promotionalDiscounts.expiresAt,
    })
    .from(promotionalDiscounts)
    .where(and(eq(promotionalDiscounts.tenantId, tenantId), eq(promotionalDiscounts.isActive, true)))
    .orderBy(desc(promotionalDiscounts.createdAt))
    .limit(6);

  // 5. Recent Dispatched Campaigns Ledger
  const recentCampaigns = await db
    .select({
      id: marketingCampaigns.id,
      name: marketingCampaigns.name,
      code: marketingCampaigns.code,
      channel: marketingCampaigns.channel,
      targetSegment: marketingCampaigns.targetSegment,
      status: marketingCampaigns.status,
      budgetKes: marketingCampaigns.budgetKes,
      attributedRevenueKes: marketingCampaigns.attributedRevenueKes,
      deliveredCount: marketingCampaigns.deliveredCount,
      convertedCount: marketingCampaigns.convertedCount,
      createdAt: marketingCampaigns.createdAt,
    })
    .from(marketingCampaigns)
    .where(and(...baseConditions))
    .orderBy(desc(marketingCampaigns.createdAt))
    .limit(5);

  return {
    kpis: {
      totalCampaigns: Number(campaignStats?.totalCampaigns || 0),
      activeCampaigns: Number(campaignStats?.activeCampaigns || 0),
      totalBudget,
      attributedRevenue,
      roas,
      avgConversionRate,
      totalDispatched: Number(campaignStats?.totalDispatched || 0),
      totalConverted,
    },
    channels: channelBreakdown.map((c) => ({
      channel: c.channel,
      campaignCount: Number(c.campaignCount),
      attributedRevenue: Number(c.attributedRevenue),
      convertedCount: Number(c.convertedCount),
    })),
    audienceSegments: {
      totalAudience: Number(segmentStats?.totalAudience || 0),
      vipMembers: Number(segmentStats?.vipMembers || 0),
      highSpenders: Number(segmentStats?.highSpenders || 0),
      corporateAccounts: Number(segmentStats?.corporateAccounts || 0),
      lapsedCustomers: Number(segmentStats?.lapsedCustomers || 0),
    },
    activePromos: activePromos.map((p) => ({
      ...p,
      discountValue: Number(p.discountValue),
    })),
    recentCampaigns: recentCampaigns.map((rc) => ({
      ...rc,
      budgetKes: Number(rc.budgetKes),
      attributedRevenueKes: Number(rc.attributedRevenueKes),
    })),
  };
};