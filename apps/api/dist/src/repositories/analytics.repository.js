"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutiveDashboardMetrics = void 0;
// apps/api/src/repositories/analytics.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const TIMEFRAME_LABELS = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    last_week: 'Last Week',
    '7days': 'Past 7 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    '30days': 'Past 30 Days',
    this_quarter: 'This Quarter',
    this_year: 'Year to Date',
    last_year: 'Last Year',
};
function resolveDateRange(timeframe, startDate, endDate) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    switch (timeframe) {
        case 'yesterday': {
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - 1);
            const end = new Date(startOfToday.getTime() - 1);
            return { start, end, granularity: 'hour' };
        }
        case 'this_week': {
            const day = startOfToday.getDay(); // 0 = Sun, 1 = Mon
            const diffToMonday = day === 0 ? 6 : day - 1;
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - diffToMonday);
            return { start, end: now, granularity: 'day' };
        }
        case 'last_week': {
            const day = startOfToday.getDay();
            const diffToMonday = day === 0 ? 6 : day - 1;
            const thisMonday = new Date(startOfToday);
            thisMonday.setDate(thisMonday.getDate() - diffToMonday);
            const start = new Date(thisMonday);
            start.setDate(start.getDate() - 7);
            const end = new Date(thisMonday.getTime() - 1);
            return { start, end, granularity: 'day' };
        }
        case '7days': {
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - 6);
            return { start, end: now, granularity: 'day' };
        }
        case 'this_month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            return { start, end: now, granularity: 'day' };
        }
        case 'last_month': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            return { start, end, granularity: 'day' };
        }
        case '30days': {
            const start = new Date(startOfToday);
            start.setDate(start.getDate() - 29);
            return { start, end: now, granularity: 'day' };
        }
        case 'this_quarter': {
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            const start = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
            return { start, end: now, granularity: 'month' };
        }
        case 'this_year': {
            const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            return { start, end: now, granularity: 'month' };
        }
        case 'last_year': {
            const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
            const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            return { start, end, granularity: 'month' };
        }
        case 'custom': {
            if (startDate) {
                const start = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
                    ? new Date(`${startDate}T00:00:00.000Z`)
                    : new Date(startDate);
                const end = endDate
                    ? /^\d{4}-\d{2}-\d{2}$/.test(endDate)
                        ? new Date(`${endDate}T23:59:59.999Z`)
                        : new Date(endDate)
                    : now;
                const spanDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                const granularity = spanDays <= 2 ? 'hour' : spanDays > 90 ? 'month' : 'day';
                return { start, end, granularity };
            }
            return { start: startOfToday, end: now, granularity: 'hour' };
        }
        default:
            return { start: startOfToday, end: now, granularity: 'hour' };
    }
}
function resolveComparisonRange(params, start, end, defaultGranularity) {
    if (params.compareMode === 'NONE')
        return null;
    // 1. Compare against ANY named preset (e.g. Today vs Last Week, This Month vs Last Month)
    if (params.compareMode === 'PRESET' && params.compareTimeframe) {
        const presetRange = resolveDateRange(params.compareTimeframe);
        return {
            prevStart: presetRange.start,
            prevEnd: presetRange.end,
            label: `vs ${TIMEFRAME_LABELS[params.compareTimeframe] || params.compareTimeframe}`,
            granularity: presetRange.granularity,
        };
    }
    // 2. Compare against ANY custom date window
    if (params.compareMode === 'CUSTOM' && params.compareStartDate) {
        const prevStart = /^\d{4}-\d{2}-\d{2}$/.test(params.compareStartDate)
            ? new Date(`${params.compareStartDate}T00:00:00.000Z`)
            : new Date(params.compareStartDate);
        const prevEnd = params.compareEndDate
            ? /^\d{4}-\d{2}-\d{2}$/.test(params.compareEndDate)
                ? new Date(`${params.compareEndDate}T23:59:59.999Z`)
                : new Date(params.compareEndDate)
            : new Date(prevStart.getTime() + Math.max(1000, end.getTime() - start.getTime()));
        const spanDays = (prevEnd.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24);
        const granularity = spanDays <= 2 ? 'hour' : spanDays > 90 ? 'month' : 'day';
        const fmt = (d) => d.toISOString().split('T')[0];
        return {
            prevStart,
            prevEnd,
            label: `vs ${fmt(prevStart)} – ${fmt(prevEnd)}`,
            granularity,
        };
    }
    // 3. Same period last year (YoY)
    if (params.compareMode === 'PREVIOUS_YEAR') {
        const prevStart = new Date(start);
        prevStart.setFullYear(prevStart.getFullYear() - 1);
        const prevEnd = new Date(end);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1);
        return {
            prevStart,
            prevEnd,
            label: 'vs Same Period Last Year',
            granularity: defaultGranularity,
        };
    }
    // 4. Smart PREVIOUS_PERIOD auto-pairing
    if (params.timeframe === 'today') {
        const yest = resolveDateRange('yesterday');
        return {
            prevStart: yest.start,
            prevEnd: yest.end,
            label: 'vs Yesterday',
            granularity: 'hour',
        };
    }
    if (params.timeframe === 'this_week') {
        const lastWk = resolveDateRange('last_week');
        return {
            prevStart: lastWk.start,
            prevEnd: lastWk.end,
            label: 'vs Last Week',
            granularity: 'day',
        };
    }
    if (params.timeframe === 'this_month') {
        const lastMo = resolveDateRange('last_month');
        return {
            prevStart: lastMo.start,
            prevEnd: lastMo.end,
            label: 'vs Last Month',
            granularity: 'day',
        };
    }
    if (params.timeframe === 'last_month') {
        const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0);
        const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
        return {
            prevStart,
            prevEnd,
            label: 'vs Prior Month',
            granularity: 'day',
        };
    }
    if (params.timeframe === 'this_year') {
        const lastYr = resolveDateRange('last_year');
        return {
            prevStart: lastYr.start,
            prevEnd: lastYr.end,
            label: 'vs Last Year',
            granularity: 'month',
        };
    }
    if (params.timeframe === 'last_year') {
        const prevStart = new Date(start.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
        const prevEnd = new Date(start.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        return {
            prevStart,
            prevEnd,
            label: `vs ${start.getFullYear() - 1}`,
            granularity: 'month',
        };
    }
    const durationMs = Math.max(1000, end.getTime() - start.getTime());
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);
    return {
        prevStart,
        prevEnd,
        label: 'vs Previous Period',
        granularity: defaultGranularity,
    };
}
function calcDeltaPct(current, previous) {
    if (previous === 0) {
        return current === 0 ? 0 : null;
    }
    return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}
function makeBranchFilter(branchIds) {
    return (col) => {
        if (branchIds === null)
            return undefined;
        if (branchIds.length === 0)
            return (0, drizzle_orm_1.sql) `FALSE`;
        return (0, drizzle_orm_1.inArray)(col, branchIds);
    };
}
async function queryTrendSeries(granularity, conditions) {
    if (granularity === 'hour') {
        return await db_1.db
            .select({
            time: (0, drizzle_orm_1.sql) `to_char(date_trunc('hour', ${schema_1.orders.createdAt}), 'HH24:00')`,
            sales: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
            orders: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...conditions))
            .groupBy((0, drizzle_orm_1.sql) `date_trunc('hour', ${schema_1.orders.createdAt})`)
            .orderBy((0, drizzle_orm_1.sql) `date_trunc('hour', ${schema_1.orders.createdAt})`);
    }
    if (granularity === 'month') {
        return await db_1.db
            .select({
            time: (0, drizzle_orm_1.sql) `to_char(date_trunc('month', ${schema_1.orders.createdAt}), 'Mon YYYY')`,
            sales: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
            orders: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...conditions))
            .groupBy((0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.orders.createdAt})`)
            .orderBy((0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.orders.createdAt})`);
    }
    return await db_1.db
        .select({
        time: (0, drizzle_orm_1.sql) `to_char(date_trunc('day', ${schema_1.orders.createdAt}), 'Mon DD')`,
        sales: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
        orders: (0, drizzle_orm_1.sql) `count(*)::int`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)(...conditions))
        .groupBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.orders.createdAt})`)
        .orderBy((0, drizzle_orm_1.sql) `date_trunc('day', ${schema_1.orders.createdAt})`);
}
const getExecutiveDashboardMetrics = async (tenantId, params) => {
    const { start, end, granularity } = resolveDateRange(params.timeframe, params.startDate, params.endDate);
    const comparisonRange = resolveComparisonRange(params, start, end, granularity);
    const hasEmptyBranchScope = params.effectiveBranchIds !== null && params.effectiveBranchIds.length === 0;
    const branchFilter = makeBranchFilter(params.effectiveBranchIds);
    const authorizedBranchFilter = makeBranchFilter(params.authorizedBranchIds);
    // Helper to resolve paymentMethod-filtered orderIds for any date window
    const resolvePaymentFilteredIds = async (winStart, winEnd) => {
        if (!params.paymentMethod || hasEmptyBranchScope)
            return null;
        const payRows = await db_1.db
            .selectDistinct({ orderId: schema_1.payments.orderId })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.paymentFlow, 'INBOUND_AR'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false), (0, drizzle_orm_1.eq)(schema_1.payments.paymentMethod, params.paymentMethod), (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, winStart), (0, drizzle_orm_1.lte)(schema_1.payments.createdAt, winEnd), branchFilter(schema_1.payments.branchId)));
        return payRows
            .map((r) => r.orderId)
            .filter((id) => id !== null);
    };
    const [paymentFilteredOrderIds, prevPaymentFilteredOrderIds] = await Promise.all([
        resolvePaymentFilteredIds(start, end),
        comparisonRange
            ? resolvePaymentFilteredIds(comparisonRange.prevStart, comparisonRange.prevEnd)
            : Promise.resolve(null),
    ]);
    const buildOrderConditions = (winStart, winEnd, payIds, scopeBranch) => [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, winStart),
        (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, winEnd),
        scopeBranch(schema_1.orders.branchId),
        params.orderType ? (0, drizzle_orm_1.eq)(schema_1.orders.orderType, params.orderType) : undefined,
        params.staffId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.orders.cashierId, params.staffId), (0, drizzle_orm_1.eq)(schema_1.orders.waiterId, params.staffId))
            : undefined,
        payIds !== null
            ? payIds.length > 0
                ? (0, drizzle_orm_1.inArray)(schema_1.orders.id, payIds)
                : (0, drizzle_orm_1.sql) `FALSE`
            : undefined,
    ].filter((c) => c !== undefined);
    const orderBaseConditions = buildOrderConditions(start, end, paymentFilteredOrderIds, branchFilter);
    const validOrderConditions = [
        ...orderBaseConditions,
        (0, drizzle_orm_1.notInArray)(schema_1.orders.status, ['Cancelled', 'Draft']),
    ];
    // For branch comparison matrix, use ALL authorized branches so outlets remain comparable
    const branchMatrixOrderConditions = [
        ...buildOrderConditions(start, end, paymentFilteredOrderIds, authorizedBranchFilter),
        (0, drizzle_orm_1.notInArray)(schema_1.orders.status, ['Cancelled', 'Draft']),
    ];
    const prevValidOrderConditions = comparisonRange
        ? [
            ...buildOrderConditions(comparisonRange.prevStart, comparisonRange.prevEnd, prevPaymentFilteredOrderIds, branchFilter),
            (0, drizzle_orm_1.notInArray)(schema_1.orders.status, ['Cancelled', 'Draft']),
        ]
        : null;
    const expiryCutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [[finRow], [cogsRow], [orderStatsRow], salesTrendRows, prevFinRows, prevCogsRows, prevTrendRows, channelRows, topProductRows, staffLeaderboardRows, branchPerfRows, [floorRow], [reservationCountRow], [waitlistCountRow], [deliveryCountRow], [items86Row], [invRow], [expiringBatchRow], [wasteRow], [transferRow], [stockCountRow], [prRow], [poRow], [apInvoiceRow], [returnsRow], openDrawerRows, [shiftStatsRow], [expenseStatsRow], [adjStatsRow], [mpesaUnallocRow], [etimsStatsRow], tenderRows, [offlineStatsRow], [loyaltyRow], recentAuditRows, staffOptions, branchOptions, channelOptions, paymentMethodOptions,] = await Promise.all([
        // 1. Current Financials
        db_1.db
            .select({
            grossRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
            netRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.subtotal}::numeric), 0)::float`,
            totalTax: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.tax}::numeric), 0)::float`,
            cateringLevy: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.cateringLevy}::numeric), 0)::float`,
            discountTotal: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.discountTotal}::numeric), 0)::float`,
            orderCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...validOrderConditions)),
        // 2. Current COGS
        db_1.db
            .select({
            totalCogs: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}::numeric * ${schema_1.orderItems.unitCostSnapshot}::numeric), 0)::float`,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), ...validOrderConditions)),
        // 3. Order lifecycle counts
        db_1.db
            .select({
            totalOrders: (0, drizzle_orm_1.sql) `count(*)::int`,
            completedOrders: (0, drizzle_orm_1.sql) `count(case when ${schema_1.orders.status} in ('Completed', 'Served') then 1 end)::int`,
            kitchenQueue: (0, drizzle_orm_1.sql) `count(case when ${schema_1.orders.status} in ('Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready') then 1 end)::int`,
            cancelledOrders: (0, drizzle_orm_1.sql) `count(case when ${schema_1.orders.status} = 'Cancelled' then 1 end)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...orderBaseConditions)),
        // 4. Current Sales Trend
        queryTrendSeries(granularity, validOrderConditions),
        // 5. Previous Period Financials (Comparison)
        prevValidOrderConditions
            ? db_1.db
                .select({
                grossRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
                netRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.subtotal}::numeric), 0)::float`,
                discountTotal: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.discountTotal}::numeric), 0)::float`,
                orderCount: (0, drizzle_orm_1.sql) `count(*)::int`,
            })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)(...prevValidOrderConditions))
            : Promise.resolve([]),
        // 6. Previous Period COGS (Comparison)
        prevValidOrderConditions
            ? db_1.db
                .select({
                totalCogs: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}::numeric * ${schema_1.orderItems.unitCostSnapshot}::numeric), 0)::float`,
            })
                .from(schema_1.orderItems)
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), ...prevValidOrderConditions))
            : Promise.resolve([]),
        // 7. Previous Period Trend (Comparison Overlay)
        prevValidOrderConditions && comparisonRange
            ? queryTrendSeries(comparisonRange.granularity, prevValidOrderConditions)
            : Promise.resolve([]),
        // 8. Channel breakdown
        db_1.db
            .select({
            type: schema_1.orders.orderType,
            revenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
            orders: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...validOrderConditions))
            .groupBy(schema_1.orders.orderType)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orders.total}::numeric)`)),
        // 9. Top selling products
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            station: schema_1.menuItems.kitchenStation,
            quantity: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}::numeric), 0)::float`,
            revenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.totalPrice}::numeric), 0)::float`,
            cogs: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}::numeric * ${schema_1.orderItems.unitCostSnapshot}::numeric), 0)::float`,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .innerJoin(schema_1.menuItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), ...validOrderConditions))
            .groupBy(schema_1.menuItems.id, schema_1.menuItems.name, schema_1.menuItems.kitchenStation)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.totalPrice}::numeric)`))
            .limit(8),
        // 10. Staff Sales Attribution Leaderboard
        db_1.db
            .select({
            staffId: schema_1.users.id,
            staffName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
            ordersCount: (0, drizzle_orm_1.sql) `count(${schema_1.orders.id})::int`,
            grossRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
            netRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.subtotal}::numeric), 0)::float`,
            discountTotal: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.discountTotal}::numeric), 0)::float`,
        })
            .from(schema_1.orders)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.users.id} = COALESCE(${schema_1.orders.cashierId}, ${schema_1.orders.waiterId})`, (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...validOrderConditions))
            .groupBy(schema_1.users.id, schema_1.users.firstName, schema_1.users.lastName, schema_1.users.role)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orders.total}::numeric)`))
            .limit(20),
        // 11. Multi-Branch Performance Comparison (always spans all authorized branches)
        db_1.db
            .select({
            branchId: schema_1.branches.id,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
            ordersCount: (0, drizzle_orm_1.sql) `count(${schema_1.orders.id})::int`,
            grossRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)::float`,
            netRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.subtotal}::numeric), 0)::float`,
            discountTotal: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.discountTotal}::numeric), 0)::float`,
        })
            .from(schema_1.branches)
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id), ...branchMatrixOrderConditions))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true), authorizedBranchFilter(schema_1.branches.id)))
            .groupBy(schema_1.branches.id, schema_1.branches.name, schema_1.branches.code)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}::numeric), 0)`)),
        // 12. Floor plan utilization
        db_1.db
            .select({
            totalSeats: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.restaurantTables.capacity}), 0)::int`,
            occupiedSeats: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.restaurantTables.status} = 'Occupied' then ${schema_1.restaurantTables.capacity} else 0 end), 0)::int`,
            availableTables: (0, drizzle_orm_1.sql) `count(case when ${schema_1.restaurantTables.status} = 'Available' then 1 end)::int`,
            occupiedTables: (0, drizzle_orm_1.sql) `count(case when ${schema_1.restaurantTables.status} = 'Occupied' then 1 end)::int`,
            reservedTables: (0, drizzle_orm_1.sql) `count(case when ${schema_1.restaurantTables.status} = 'Reserved' then 1 end)::int`,
            cleaningTables: (0, drizzle_orm_1.sql) `count(case when ${schema_1.restaurantTables.status} = 'Cleaning' then 1 end)::int`,
        })
            .from(schema_1.restaurantTables)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId), branchFilter(schema_1.restaurantTables.branchId))),
        // 13. Active reservations
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.reservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.reservations.status, ['Pending', 'Confirmed', 'Checked-In']), branchFilter(schema_1.reservations.branchId))),
        // 14. Waitlist count
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.waitlistEntries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waitlistEntries.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.waitlistEntries.status, ['Waiting', 'Notified']), branchFilter(schema_1.waitlistEntries.branchId))),
        // 15. Active deliveries
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.deliveryAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.deliveryAssignments.status, ['Assigned', 'Dispatched']), branchFilter(schema_1.deliveryAssignments.branchId))),
        // 16. 86ed menu items
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.is86ed, true), branchFilter(schema_1.menuItemAvailability.branchId))),
        // 17. Inventory valuation & par status
        db_1.db
            .select({
            totalSkus: (0, drizzle_orm_1.sql) `count(*)::int`,
            totalValuation: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.currentStock}::numeric * ${schema_1.inventoryItems.costPrice}::numeric), 0)::float`,
            depletedItemsCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.inventoryItems.currentStock}::numeric > 0 and ${schema_1.inventoryItems.currentStock}::numeric <= ${schema_1.inventoryItems.minThreshold}::numeric then 1 end)::int`,
            outOfStockCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.inventoryItems.currentStock}::numeric <= 0 then 1 end)::int`,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true), branchFilter(schema_1.inventoryItems.branchId))),
        // 18. Expiring batches
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.inventoryBatches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.status, 'ACTIVE'), (0, drizzle_orm_1.sql) `${schema_1.inventoryBatches.currentQuantity}::numeric > 0`, (0, drizzle_orm_1.lte)(schema_1.inventoryBatches.expiryDate, expiryCutoff), branchFilter(schema_1.inventoryBatches.branchId))),
        // 19. Waste & spoilage
        db_1.db
            .select({
            wasteLossAmount: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.wasteLogs.totalLossCost}::numeric), 0)::float`,
            wasteIncidentsCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.wasteLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wasteLogs.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.wasteLogs.loggedAt, start), (0, drizzle_orm_1.lte)(schema_1.wasteLogs.loggedAt, end), branchFilter(schema_1.wasteLogs.branchId))),
        // 20. Active stock transfers
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.stockTransfers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.stockTransfers.status, ['PENDING', 'APPROVED', 'IN_TRANSIT']))),
        // 21. Open physical stock counts
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.stockCounts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.stockCounts.status, ['IN_PROGRESS', 'PENDING_APPROVAL']), branchFilter(schema_1.stockCounts.branchId))),
        // 22. Pending purchase requisitions
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.purchaseRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.status, 'PENDING'), branchFilter(schema_1.purchaseRequests.branchId))),
        // 23. Open purchase orders
        db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `count(*)::int`,
            commitment: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.purchaseOrders.totalAmount}::numeric), 0)::float`,
        })
            .from(schema_1.purchaseOrders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.purchaseOrders.status, ['DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED']), branchFilter(schema_1.purchaseOrders.branchId))),
        // 24. Unpaid supplier invoices
        db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `count(*)::int`,
            balance: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.totalAmount}::numeric - ${schema_1.supplierInvoices.paidAmount}::numeric), 0)::float`,
        })
            .from(schema_1.supplierInvoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.supplierInvoices.status, ['UNPAID', 'PARTIALLY_PAID']), branchFilter(schema_1.supplierInvoices.branchId))),
        // 25. Pending supplier returns
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.supplierReturns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierReturns.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.supplierReturns.status, ['PENDING_DISPATCH', 'DISPATCHED']), branchFilter(schema_1.supplierReturns.branchId))),
        // 26. Open cash drawers
        db_1.db
            .select({
            drawerName: schema_1.cashDrawers.name,
            openingFloat: schema_1.drawerSessions.openingFloat,
            expectedClosing: schema_1.drawerSessions.expectedClosingBalance,
        })
            .from(schema_1.drawerSessions)
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.drawerSessions.status, ['OPEN', 'ACTIVE']), branchFilter(schema_1.cashDrawers.branchId))),
        // 27. Cashier shifts
        db_1.db
            .select({
            openShiftsCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'OPEN' then 1 end)::int`,
            closedShiftsCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'CLOSED' then 1 end)::int`,
            netShiftVariance: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.cashierShifts.variance}::numeric), 0)::float`,
        })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.cashierShifts.openedAt, start), (0, drizzle_orm_1.lte)(schema_1.cashierShifts.openedAt, end), branchFilter(schema_1.cashierShifts.branchId))),
        // 28. Corporate expenses
        db_1.db
            .select({
            pendingCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.expenses.status} = 'SUBMITTED' then 1 end)::int`,
            approvedTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.expenses.status} in ('APPROVED', 'PAID_DISBURSED') then ${schema_1.expenses.totalAmount}::numeric else 0 end), 0)::float`,
        })
            .from(schema_1.expenses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.expenses.tenantId, tenantId), branchFilter(schema_1.expenses.branchId))),
        // 29. Pending GL adjustments
        db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `count(*)::int`,
            amount: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.financialAdjustments.amount}::numeric), 0)::float`,
        })
            .from(schema_1.financialAdjustments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.financialAdjustments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.status, 'PENDING_APPROVAL'), branchFilter(schema_1.financialAdjustments.branchId))),
        // 30. Unallocated M-Pesa callbacks
        db_1.db
            .select({
            count: (0, drizzle_orm_1.sql) `count(*)::int`,
            amount: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.mpesaC2bCallbacks.transAmount}::numeric - ${schema_1.mpesaC2bCallbacks.allocatedAmount}::numeric), 0)::float`,
        })
            .from(schema_1.mpesaC2bCallbacks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaC2bCallbacks.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.mpesaC2bCallbacks.allocationStatus, ['UNALLOCATED', 'PARTIALLY_ALLOCATED']), branchFilter(schema_1.mpesaC2bCallbacks.branchId))),
        // 31. KRA eTIMS fiscal invoices
        db_1.db
            .select({
            fiscalizedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} = 'FISCALIZED' then 1 end)::int`,
            pendingCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.fiscalInvoices.fiscalStatus} in ('PENDING', 'FAILED') then 1 end)::int`,
        })
            .from(schema_1.fiscalInvoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.fiscalInvoices.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.fiscalInvoices.createdAt, end), branchFilter(schema_1.fiscalInvoices.branchId))),
        // 32. Tender breakdown
        db_1.db
            .select({
            method: schema_1.payments.paymentMethod,
            amount: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.payments.amount}::numeric), 0)::float`,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.paymentFlow, 'INBOUND_AR'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false), (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.payments.createdAt, end), branchFilter(schema_1.payments.branchId), params.paymentMethod ? (0, drizzle_orm_1.eq)(schema_1.payments.paymentMethod, params.paymentMethod) : undefined))
            .groupBy(schema_1.payments.paymentMethod)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.payments.amount}::numeric)`)),
        // 33. Offline sync telemetry
        db_1.db
            .select({
            batchesCount: (0, drizzle_orm_1.sql) `count(*)::int`,
            reconciledOrders: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.offlineSyncBatches.recordCount}), 0)::int`,
            conflictsCount: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.offlineSyncBatches.conflictCount}), 0)::int`,
            avgLatencyMs: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.offlineSyncBatches.syncDurationMs}), 0)::float`,
            lastSyncAt: (0, drizzle_orm_1.sql) `max(${schema_1.offlineSyncBatches.completedAt})`,
        })
            .from(schema_1.offlineSyncBatches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.offlineSyncBatches.tenantId, tenantId), branchFilter(schema_1.offlineSyncBatches.branchId))),
        // 34. Loyalty membership pool
        db_1.db
            .select({
            enrolledMembersCount: (0, drizzle_orm_1.sql) `count(*)::int`,
            activePointsPool: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.customerLoyaltyProfiles.currentPoints}), 0)::int`,
        })
            .from(schema_1.customerLoyaltyProfiles)
            .where((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tenantId, tenantId)),
        // 35. Recent audit stream
        db_1.db
            .select({
            id: schema_1.auditLogs.id,
            action: schema_1.auditLogs.action,
            module: schema_1.auditLogs.module,
            entityType: schema_1.auditLogs.entityType,
            actorName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), '')`,
            createdAt: schema_1.auditLogs.createdAt,
        })
            .from(schema_1.auditLogs)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId), branchFilter(schema_1.auditLogs.branchId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.createdAt))
            .limit(6),
        // 36. Live staff filter options
        db_1.db
            .select({
            id: schema_1.users.id,
            name: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName)),
        // 37. Authorized branch filter options (NEVER narrowed by selected branchId)
        db_1.db
            .select({
            id: schema_1.branches.id,
            name: schema_1.branches.name,
            code: schema_1.branches.code,
        })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true), authorizedBranchFilter(schema_1.branches.id)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.branches.name)),
        // 38. Distinct channels
        db_1.db
            .selectDistinct({ orderType: schema_1.orders.orderType })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.orders.orderType)),
        // 39. Distinct payment methods
        db_1.db
            .selectDistinct({ paymentMethod: schema_1.payments.paymentMethod })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.paymentFlow, 'INBOUND_AR')))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.payments.paymentMethod)),
    ]);
    const grossRevenue = Number(finRow?.grossRevenue ?? 0);
    const netRevenue = Number(finRow?.netRevenue ?? 0);
    const totalCogs = Number(cogsRow?.totalCogs ?? 0);
    const grossProfit = Math.max(0, netRevenue - totalCogs);
    const grossMarginPercent = netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(1)) : 0;
    const validOrderCount = Number(finRow?.orderCount ?? 0);
    const averageOrderValue = validOrderCount > 0 ? Number((grossRevenue / validOrderCount).toFixed(2)) : 0;
    // Comparison calculations
    let comparison = null;
    if (comparisonRange) {
        const prevFin = prevFinRows[0];
        const prevCogs = Number(prevCogsRows[0]?.totalCogs ?? 0);
        const prevGross = Number(prevFin?.grossRevenue ?? 0);
        const prevNet = Number(prevFin?.netRevenue ?? 0);
        const prevOrders = Number(prevFin?.orderCount ?? 0);
        const prevDiscount = Number(prevFin?.discountTotal ?? 0);
        const prevProfit = Math.max(0, prevNet - prevCogs);
        const prevMarginPct = prevNet > 0 ? Number(((prevProfit / prevNet) * 100).toFixed(1)) : 0;
        const prevAov = prevOrders > 0 ? Number((prevGross / prevOrders).toFixed(2)) : 0;
        comparison = {
            mode: params.compareMode,
            label: comparisonRange.label,
            periodStart: comparisonRange.prevStart.toISOString(),
            periodEnd: comparisonRange.prevEnd.toISOString(),
            previous: {
                grossRevenue: Number(prevGross.toFixed(2)),
                netRevenue: Number(prevNet.toFixed(2)),
                totalCogs: Number(prevCogs.toFixed(2)),
                grossProfit: Number(prevProfit.toFixed(2)),
                grossMarginPercent: prevMarginPct,
                totalOrders: prevOrders,
                averageOrderValue: prevAov,
                discountTotal: Number(prevDiscount.toFixed(2)),
            },
            deltas: {
                grossRevenuePct: calcDeltaPct(grossRevenue, prevGross),
                netRevenuePct: calcDeltaPct(netRevenue, prevNet),
                grossMarginPts: Number((grossMarginPercent - prevMarginPct).toFixed(1)),
                ordersPct: calcDeltaPct(validOrderCount, prevOrders),
                aovPct: calcDeltaPct(averageOrderValue, prevAov),
                discountPct: calcDeltaPct(Number(finRow?.discountTotal ?? 0), prevDiscount),
            },
        };
    }
    // Merge current & previous trend points for chart comparison overlay
    const maxTrendLen = Math.max(salesTrendRows.length, prevTrendRows.length);
    const mergedSalesTrend = Array.from({ length: maxTrendLen }, (_, idx) => {
        const curr = salesTrendRows[idx];
        const prev = prevTrendRows[idx];
        return {
            time: curr?.time ?? prev?.time ?? `#${idx + 1}`,
            sales: Number((curr?.sales ?? 0).toFixed(2)),
            orders: Number(curr?.orders ?? 0),
            previousSales: comparisonRange ? Number((prev?.sales ?? 0).toFixed(2)) : undefined,
            previousOrders: comparisonRange ? Number(prev?.orders ?? 0) : undefined,
            previousTime: prev?.time,
        };
    });
    const totalSeats = Number(floorRow?.totalSeats ?? 0);
    const occupiedSeats = Number(floorRow?.occupiedSeats ?? 0);
    const utilizationRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    const openingFloat = openDrawerRows.reduce((s, r) => s + (parseFloat(r.openingFloat) || 0), 0);
    const expectedClosing = openDrawerRows.reduce((s, r) => s + (parseFloat(r.expectedClosing) || 0), 0);
    return {
        period: {
            timeframe: params.timeframe,
            start: start.toISOString(),
            end: end.toISOString(),
            granularity,
        },
        comparison,
        financials: {
            grossRevenue: Number(grossRevenue.toFixed(2)),
            netRevenue: Number(netRevenue.toFixed(2)),
            totalTax: Number((finRow?.totalTax ?? 0).toFixed(2)),
            cateringLevy: Number((finRow?.cateringLevy ?? 0).toFixed(2)),
            discountTotal: Number((finRow?.discountTotal ?? 0).toFixed(2)),
            averageOrderValue,
            totalCogs: Number(totalCogs.toFixed(2)),
            grossProfit: Number(grossProfit.toFixed(2)),
            grossMarginPercent,
        },
        orders: {
            totalOrders: Number(orderStatsRow?.totalOrders ?? 0),
            completedOrders: Number(orderStatsRow?.completedOrders ?? 0),
            kitchenQueue: Number(orderStatsRow?.kitchenQueue ?? 0),
            cancelledOrders: Number(orderStatsRow?.cancelledOrders ?? 0),
            activeDeliveries: Number(deliveryCountRow?.count ?? 0),
        },
        floorPlan: {
            totalSeats,
            occupiedSeats,
            utilizationRate,
            availableTables: Number(floorRow?.availableTables ?? 0),
            occupiedTables: Number(floorRow?.occupiedTables ?? 0),
            reservedTables: Number(floorRow?.reservedTables ?? 0),
            cleaningTables: Number(floorRow?.cleaningTables ?? 0),
            activeReservations: Number(reservationCountRow?.count ?? 0),
            waitlistCount: Number(waitlistCountRow?.count ?? 0),
            items86edCount: Number(items86Row?.count ?? 0),
        },
        inventory: {
            totalSkus: Number(invRow?.totalSkus ?? 0),
            totalValuation: Number((invRow?.totalValuation ?? 0).toFixed(2)),
            depletedItemsCount: Number(invRow?.depletedItemsCount ?? 0),
            outOfStockCount: Number(invRow?.outOfStockCount ?? 0),
            expiringBatchesCount: Number(expiringBatchRow?.count ?? 0),
            wasteLossAmount: Number((wasteRow?.wasteLossAmount ?? 0).toFixed(2)),
            wasteIncidentsCount: Number(wasteRow?.wasteIncidentsCount ?? 0),
            activeTransfersCount: Number(transferRow?.count ?? 0),
            openStockCounts: Number(stockCountRow?.count ?? 0),
        },
        procurement: {
            pendingRequisitions: Number(prRow?.count ?? 0),
            openPurchaseOrders: Number(poRow?.count ?? 0),
            openPoCommitment: Number((poRow?.commitment ?? 0).toFixed(2)),
            unpaidInvoicesCount: Number(apInvoiceRow?.count ?? 0),
            accountsPayableBalance: Number((apInvoiceRow?.balance ?? 0).toFixed(2)),
            pendingSupplierReturns: Number(returnsRow?.count ?? 0),
        },
        treasury: {
            hasActiveSession: openDrawerRows.length > 0,
            activeDrawersCount: openDrawerRows.length,
            drawerName: openDrawerRows[0]?.drawerName ?? null,
            openingFloat: Number(openingFloat.toFixed(2)),
            expectedClosing: Number(expectedClosing.toFixed(2)),
            openShiftsCount: Number(shiftStatsRow?.openShiftsCount ?? 0),
            closedShiftsCount: Number(shiftStatsRow?.closedShiftsCount ?? 0),
            netShiftVariance: Number((shiftStatsRow?.netShiftVariance ?? 0).toFixed(2)),
            pendingExpensesCount: Number(expenseStatsRow?.pendingCount ?? 0),
            approvedExpensesTotal: Number((expenseStatsRow?.approvedTotal ?? 0).toFixed(2)),
            pendingAdjustmentsCount: Number(adjStatsRow?.count ?? 0),
            pendingAdjustmentsAmount: Number((adjStatsRow?.amount ?? 0).toFixed(2)),
            unallocatedMpesaCount: Number(mpesaUnallocRow?.count ?? 0),
            unallocatedMpesaAmount: Number((mpesaUnallocRow?.amount ?? 0).toFixed(2)),
            etimsFiscalizedCount: Number(etimsStatsRow?.fiscalizedCount ?? 0),
            etimsPendingCount: Number(etimsStatsRow?.pendingCount ?? 0),
            tenderBreakdown: tenderRows.map((t) => ({
                method: t.method,
                amount: Number(t.amount.toFixed(2)),
            })),
        },
        offline: {
            batchesCount: Number(offlineStatsRow?.batchesCount ?? 0),
            reconciledOrders: Number(offlineStatsRow?.reconciledOrders ?? 0),
            conflictsCount: Number(offlineStatsRow?.conflictsCount ?? 0),
            avgLatencyMs: Math.round(Number(offlineStatsRow?.avgLatencyMs ?? 0)),
            lastSyncAt: offlineStatsRow?.lastSyncAt ?? null,
        },
        loyalty: {
            enrolledMembersCount: Number(loyaltyRow?.enrolledMembersCount ?? 0),
            activePointsPool: Number(loyaltyRow?.activePointsPool ?? 0),
        },
        salesTrend: mergedSalesTrend,
        channelBreakdown: channelRows.map((c) => ({
            type: c.type,
            revenue: Number(c.revenue.toFixed(2)),
            orders: Number(c.orders),
        })),
        topProducts: topProductRows.map((p) => {
            const marginPct = p.revenue > 0 ? Number((((p.revenue - p.cogs) / p.revenue) * 100).toFixed(1)) : 0;
            return {
                id: p.id,
                name: p.name,
                station: p.station,
                quantity: Number(p.quantity),
                revenue: Number(p.revenue.toFixed(2)),
                marginPercent: marginPct,
            };
        }),
        staffPerformance: staffLeaderboardRows.map((s) => {
            const atv = s.ordersCount > 0 ? Number((s.grossRevenue / s.ordersCount).toFixed(2)) : 0;
            const discountRate = s.grossRevenue + s.discountTotal > 0
                ? Number(((s.discountTotal / (s.grossRevenue + s.discountTotal)) * 100).toFixed(1))
                : 0;
            return {
                staffId: s.staffId,
                staffName: s.staffName,
                role: s.role,
                ordersCount: s.ordersCount,
                grossRevenue: Number(s.grossRevenue.toFixed(2)),
                netRevenue: Number(s.netRevenue.toFixed(2)),
                averageTicketValue: atv,
                discountTotal: Number(s.discountTotal.toFixed(2)),
                discountRate,
            };
        }),
        branchComparison: branchPerfRows.map((b) => ({
            branchId: b.branchId,
            branchName: b.branchName,
            branchCode: b.branchCode,
            ordersCount: b.ordersCount,
            grossRevenue: Number(b.grossRevenue.toFixed(2)),
            netRevenue: Number(b.netRevenue.toFixed(2)),
            averageOrderValue: b.ordersCount > 0 ? Number((b.grossRevenue / b.ordersCount).toFixed(2)) : 0,
            discountTotal: Number(b.discountTotal.toFixed(2)),
        })),
        filterOptions: {
            staff: staffOptions,
            branches: branchOptions,
            channels: channelOptions.map((c) => c.orderType),
            paymentMethods: paymentMethodOptions.map((p) => p.paymentMethod),
        },
        recentAudits: recentAuditRows,
    };
};
exports.getExecutiveDashboardMetrics = getExecutiveDashboardMetrics;
