"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarketingHubExecutiveMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const parseTimeRange = (range, customStart, customEnd) => {
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
const getMarketingHubExecutiveMetrics = async (tenantId, query) => {
    const { start, end } = parseTimeRange(query.timeRange, query.startDate, query.endDate);
    const baseConditions = [
        (0, drizzle_orm_1.eq)(schema_1.marketingCampaigns.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.marketingCampaigns.createdAt, start),
        (0, drizzle_orm_1.lte)(schema_1.marketingCampaigns.createdAt, end),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.marketingCampaigns.branchId, query.branchId) : undefined,
    ].filter(Boolean);
    // 1. High-Level Performance Aggregate
    const [campaignStats] = await db_1.db
        .select({
        totalCampaigns: (0, drizzle_orm_1.sql) `count(*)`,
        activeCampaigns: (0, drizzle_orm_1.sql) `count(case when ${schema_1.marketingCampaigns.status} in ('ACTIVE', 'SCHEDULED') then 1 end)`,
        totalBudget: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.budgetKes}), 0)::numeric`,
        attributedRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.attributedRevenueKes}), 0)::numeric`,
        totalDispatched: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.recipientsCount}), 0)::numeric`,
        totalDelivered: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.deliveredCount}), 0)::numeric`,
        totalConverted: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.convertedCount}), 0)::numeric`,
    })
        .from(schema_1.marketingCampaigns)
        .where((0, drizzle_orm_1.and)(...baseConditions));
    const totalBudget = Number(campaignStats?.totalBudget || 0);
    const attributedRevenue = Number(campaignStats?.attributedRevenue || 0);
    const totalDelivered = Number(campaignStats?.totalDelivered || 0);
    const totalConverted = Number(campaignStats?.totalConverted || 0);
    const roas = totalBudget > 0 ? Math.round((attributedRevenue / totalBudget) * 10) / 10 : 0;
    const avgConversionRate = totalDelivered > 0 ? Math.round((totalConverted / totalDelivered) * 1000) / 10 : 0;
    // 2. Channel Distribution (SMS vs. Email vs. Push vs. Omnichannel)
    const channelBreakdown = await db_1.db
        .select({
        channel: schema_1.marketingCampaigns.channel,
        campaignCount: (0, drizzle_orm_1.sql) `count(*)`,
        attributedRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.attributedRevenueKes}), 0)::numeric`,
        convertedCount: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.marketingCampaigns.convertedCount}), 0)::numeric`,
    })
        .from(schema_1.marketingCampaigns)
        .where((0, drizzle_orm_1.and)(...baseConditions))
        .groupBy(schema_1.marketingCampaigns.channel)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.marketingCampaigns.attributedRevenueKes})`));
    // 3. Customer Audience Segmentation Landscape
    const [segmentStats] = await db_1.db
        .select({
        totalAudience: (0, drizzle_orm_1.sql) `count(*)`,
        vipMembers: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customers.loyaltyPoints} >= 500 then 1 end)`,
        highSpenders: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customers.totalSpent} >= 10000 then 1 end)`,
        corporateAccounts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customers.customerType} = 'CORPORATE' then 1 end)`,
        lapsedCustomers: (0, drizzle_orm_1.sql) `count(case when ${schema_1.customers.ordersCount} > 0 and ${schema_1.customers.updatedAt} < now() - interval '45 days' then 1 end)`,
    })
        .from(schema_1.customers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.customers.isActive, true)));
    // 4. Active Financial Promo Code Liabilities
    const activePromos = await db_1.db
        .select({
        id: schema_1.promotionalDiscounts.id,
        code: schema_1.promotionalDiscounts.code,
        discountType: schema_1.promotionalDiscounts.discountType,
        discountValue: schema_1.promotionalDiscounts.discountValue,
        maxUsageCount: schema_1.promotionalDiscounts.maxUsageCount,
        currentUsageCount: schema_1.promotionalDiscounts.currentUsageCount,
        expiresAt: schema_1.promotionalDiscounts.expiresAt,
    })
        .from(schema_1.promotionalDiscounts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.promotionalDiscounts.isActive, true)))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.promotionalDiscounts.createdAt))
        .limit(6);
    // 5. Recent Dispatched Campaigns Ledger
    const recentCampaigns = await db_1.db
        .select({
        id: schema_1.marketingCampaigns.id,
        name: schema_1.marketingCampaigns.name,
        code: schema_1.marketingCampaigns.code,
        channel: schema_1.marketingCampaigns.channel,
        targetSegment: schema_1.marketingCampaigns.targetSegment,
        status: schema_1.marketingCampaigns.status,
        budgetKes: schema_1.marketingCampaigns.budgetKes,
        attributedRevenueKes: schema_1.marketingCampaigns.attributedRevenueKes,
        deliveredCount: schema_1.marketingCampaigns.deliveredCount,
        convertedCount: schema_1.marketingCampaigns.convertedCount,
        createdAt: schema_1.marketingCampaigns.createdAt,
    })
        .from(schema_1.marketingCampaigns)
        .where((0, drizzle_orm_1.and)(...baseConditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.marketingCampaigns.createdAt))
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
exports.getMarketingHubExecutiveMetrics = getMarketingHubExecutiveMetrics;
