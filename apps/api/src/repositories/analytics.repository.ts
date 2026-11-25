// apps/api/src/repositories/analytics.repository.ts
import {
  eq,
  and,
  gte,
  lte,
  desc,
  asc,
  sql,
  inArray,
  notInArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  payments,
  restaurantTables,
  reservations,
  waitlistEntries,
  deliveryAssignments,
  menuItemAvailability,
  inventoryItems,
  inventoryBatches,
  wasteLogs,
  stockTransfers,
  stockCounts,
  purchaseRequests,
  purchaseOrders,
  supplierInvoices,
  supplierReturns,
  cashDrawers,
  drawerSessions,
  cashierShifts,
  expenses,
  financialAdjustments,
  mpesaC2bCallbacks,
  fiscalInvoices,
  customerLoyaltyProfiles,
  offlineSyncBatches,
  auditLogs,
  users,
  branches,
} from '../config/schema';
import type { DashboardAnalyticsQuery } from '../validators/analytics.validator';

export interface ScopedAnalyticsParams extends DashboardAnalyticsQuery {
  authorizedBranchIds: number[] | null; // All branches user can access (for dropdown & branch matrix)
  effectiveBranchIds: number[] | null; // Active branch slice (null = all tenant branches)
}

type TrendGranularity = 'hour' | 'day' | 'month';
type BranchFilterFn = <T>(col: T) => SQL | undefined;

const TIMEFRAME_LABELS: Record<string, string> = {
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

function resolveDateRange(
  timeframe: DashboardAnalyticsQuery['timeframe'],
  startDate?: string,
  endDate?: string
): { start: Date; end: Date; granularity: TrendGranularity } {
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
        const granularity: TrendGranularity =
          spanDays <= 2 ? 'hour' : spanDays > 90 ? 'month' : 'day';
        return { start, end, granularity };
      }
      return { start: startOfToday, end: now, granularity: 'hour' };
    }
    default:
      return { start: startOfToday, end: now, granularity: 'hour' };
  }
}

function resolveComparisonRange(
  params: Pick<
    DashboardAnalyticsQuery,
    'timeframe' | 'compareMode' | 'compareTimeframe' | 'compareStartDate' | 'compareEndDate'
  >,
  start: Date,
  end: Date,
  defaultGranularity: TrendGranularity
): { prevStart: Date; prevEnd: Date; label: string; granularity: TrendGranularity } | null {
  if (params.compareMode === 'NONE') return null;

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
    const granularity: TrendGranularity =
      spanDays <= 2 ? 'hour' : spanDays > 90 ? 'month' : 'day';
    const fmt = (d: Date) => d.toISOString().split('T')[0];

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

function calcDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function makeBranchFilter(branchIds: number[] | null): BranchFilterFn {
  return <T>(col: T): SQL | undefined => {
    if (branchIds === null) return undefined;
    if (branchIds.length === 0) return sql`FALSE`;
    return inArray(col as never, branchIds);
  };
}

async function queryTrendSeries(
  granularity: TrendGranularity,
  conditions: SQL[]
) {
  if (granularity === 'hour') {
    return await db
      .select({
        time: sql<string>`to_char(date_trunc('hour', ${orders.createdAt}), 'HH24:00')`,
        sales: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('hour', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('hour', ${orders.createdAt})`);
  }

  if (granularity === 'month') {
    return await db
      .select({
        time: sql<string>`to_char(date_trunc('month', ${orders.createdAt}), 'Mon YYYY')`,
        sales: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('month', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('month', ${orders.createdAt})`);
  }

  return await db
    .select({
      time: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'Mon DD')`,
      sales: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
      orders: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
    .orderBy(sql`date_trunc('day', ${orders.createdAt})`);
}

export const getExecutiveDashboardMetrics = async (
  tenantId: number,
  params: ScopedAnalyticsParams
) => {
  const { start, end, granularity } = resolveDateRange(
    params.timeframe,
    params.startDate,
    params.endDate
  );

  const comparisonRange = resolveComparisonRange(params, start, end, granularity);

  const hasEmptyBranchScope =
    params.effectiveBranchIds !== null && params.effectiveBranchIds.length === 0;

  const branchFilter = makeBranchFilter(params.effectiveBranchIds);
  const authorizedBranchFilter = makeBranchFilter(params.authorizedBranchIds);

  // Helper to resolve paymentMethod-filtered orderIds for any date window
  const resolvePaymentFilteredIds = async (winStart: Date, winEnd: Date) => {
    if (!params.paymentMethod || hasEmptyBranchScope) return null;
    const payRows = await db
      .selectDistinct({ orderId: payments.orderId })
      .from(payments)
      .where(
        and(
          eq(payments.tenantId, tenantId),
          eq(payments.paymentFlow, 'INBOUND_AR'),
          eq(payments.isReversed, false),
          eq(payments.paymentMethod, params.paymentMethod),
          gte(payments.createdAt, winStart),
          lte(payments.createdAt, winEnd),
          branchFilter(payments.branchId)
        )
      );
    return payRows
      .map((r) => r.orderId)
      .filter((id): id is number => id !== null);
  };

  const [paymentFilteredOrderIds, prevPaymentFilteredOrderIds] = await Promise.all([
    resolvePaymentFilteredIds(start, end),
    comparisonRange
      ? resolvePaymentFilteredIds(comparisonRange.prevStart, comparisonRange.prevEnd)
      : Promise.resolve(null),
  ]);

  const buildOrderConditions = (
    winStart: Date,
    winEnd: Date,
    payIds: number[] | null,
    scopeBranch: BranchFilterFn
  ): SQL[] =>
    [
      eq(orders.tenantId, tenantId),
      gte(orders.createdAt, winStart),
      lte(orders.createdAt, winEnd),
      scopeBranch(orders.branchId),
      params.orderType ? eq(orders.orderType, params.orderType) : undefined,
      params.staffId
        ? or(eq(orders.cashierId, params.staffId), eq(orders.waiterId, params.staffId))
        : undefined,
      payIds !== null
        ? payIds.length > 0
          ? inArray(orders.id, payIds)
          : sql`FALSE`
        : undefined,
    ].filter((c): c is SQL => c !== undefined);

  const orderBaseConditions: SQL[] = buildOrderConditions(
    start,
    end,
    paymentFilteredOrderIds,
    branchFilter
  );
  const validOrderConditions: SQL[] = [
    ...orderBaseConditions,
    notInArray(orders.status, ['Cancelled', 'Draft']),
  ];

  // For branch comparison matrix, use ALL authorized branches so outlets remain comparable
  const branchMatrixOrderConditions: SQL[] = [
    ...buildOrderConditions(start, end, paymentFilteredOrderIds, authorizedBranchFilter),
    notInArray(orders.status, ['Cancelled', 'Draft']),
  ];

  const prevValidOrderConditions: SQL[] | null = comparisonRange
    ? [
        ...buildOrderConditions(
          comparisonRange.prevStart,
          comparisonRange.prevEnd,
          prevPaymentFilteredOrderIds,
          branchFilter
        ),
        notInArray(orders.status, ['Cancelled', 'Draft']),
      ]
    : null;

  const expiryCutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [
    [finRow],
    [cogsRow],
    [orderStatsRow],
    salesTrendRows,
    prevFinRows,
    prevCogsRows,
    prevTrendRows,
    channelRows,
    topProductRows,
    staffLeaderboardRows,
    branchPerfRows,
    [floorRow],
    [reservationCountRow],
    [waitlistCountRow],
    [deliveryCountRow],
    [items86Row],
    [invRow],
    [expiringBatchRow],
    [wasteRow],
    [transferRow],
    [stockCountRow],
    [prRow],
    [poRow],
    [apInvoiceRow],
    [returnsRow],
    openDrawerRows,
    [shiftStatsRow],
    [expenseStatsRow],
    [adjStatsRow],
    [mpesaUnallocRow],
    [etimsStatsRow],
    tenderRows,
    [offlineStatsRow],
    [loyaltyRow],
    recentAuditRows,
    staffOptions,
    branchOptions,
    channelOptions,
    paymentMethodOptions,
  ] = await Promise.all([
    // 1. Current Financials
    db
      .select({
        grossRevenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
        netRevenue: sql<number>`coalesce(sum(${orders.subtotal}::numeric), 0)::float`,
        totalTax: sql<number>`coalesce(sum(${orders.tax}::numeric), 0)::float`,
        cateringLevy: sql<number>`coalesce(sum(${orders.cateringLevy}::numeric), 0)::float`,
        discountTotal: sql<number>`coalesce(sum(${orders.discountTotal}::numeric), 0)::float`,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(...validOrderConditions)),

    // 2. Current COGS
    db
      .select({
        totalCogs: sql<number>`coalesce(sum(${orderItems.quantity}::numeric * ${orderItems.unitCostSnapshot}::numeric), 0)::float`,
      })
      .from(orderItems)
      .innerJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.tenantId, tenantId)))
      .where(and(eq(orderItems.tenantId, tenantId), ...validOrderConditions)),

    // 3. Order lifecycle counts
    db
      .select({
        totalOrders: sql<number>`count(*)::int`,
        completedOrders: sql<number>`count(case when ${orders.status} in ('Completed', 'Served') then 1 end)::int`,
        kitchenQueue: sql<number>`count(case when ${orders.status} in ('Confirmed', 'Sent-To-Kitchen', 'Preparing', 'Ready') then 1 end)::int`,
        cancelledOrders: sql<number>`count(case when ${orders.status} = 'Cancelled' then 1 end)::int`,
      })
      .from(orders)
      .where(and(...orderBaseConditions)),

    // 4. Current Sales Trend
    queryTrendSeries(granularity, validOrderConditions),

    // 5. Previous Period Financials (Comparison)
    prevValidOrderConditions
      ? db
          .select({
            grossRevenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
            netRevenue: sql<number>`coalesce(sum(${orders.subtotal}::numeric), 0)::float`,
            discountTotal: sql<number>`coalesce(sum(${orders.discountTotal}::numeric), 0)::float`,
            orderCount: sql<number>`count(*)::int`,
          })
          .from(orders)
          .where(and(...prevValidOrderConditions))
      : Promise.resolve([]),

    // 6. Previous Period COGS (Comparison)
    prevValidOrderConditions
      ? db
          .select({
            totalCogs: sql<number>`coalesce(sum(${orderItems.quantity}::numeric * ${orderItems.unitCostSnapshot}::numeric), 0)::float`,
          })
          .from(orderItems)
          .innerJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.tenantId, tenantId)))
          .where(and(eq(orderItems.tenantId, tenantId), ...prevValidOrderConditions))
      : Promise.resolve([]),

    // 7. Previous Period Trend (Comparison Overlay)
    prevValidOrderConditions && comparisonRange
      ? queryTrendSeries(comparisonRange.granularity, prevValidOrderConditions)
      : Promise.resolve([]),

    // 8. Channel breakdown
    db
      .select({
        type: orders.orderType,
        revenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
        orders: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(...validOrderConditions))
      .groupBy(orders.orderType)
      .orderBy(desc(sql`sum(${orders.total}::numeric)`)),

    // 9. Top selling products
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        station: menuItems.kitchenStation,
        quantity: sql<number>`coalesce(sum(${orderItems.quantity}::numeric), 0)::float`,
        revenue: sql<number>`coalesce(sum(${orderItems.totalPrice}::numeric), 0)::float`,
        cogs: sql<number>`coalesce(sum(${orderItems.quantity}::numeric * ${orderItems.unitCostSnapshot}::numeric), 0)::float`,
      })
      .from(orderItems)
      .innerJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.tenantId, tenantId)))
      .innerJoin(
        menuItems,
        and(eq(orderItems.menuItemId, menuItems.id), eq(menuItems.tenantId, tenantId))
      )
      .where(and(eq(orderItems.tenantId, tenantId), ...validOrderConditions))
      .groupBy(menuItems.id, menuItems.name, menuItems.kitchenStation)
      .orderBy(desc(sql`sum(${orderItems.totalPrice}::numeric)`))
      .limit(8),

    // 10. Staff Sales Attribution Leaderboard
    db
      .select({
        staffId: users.id,
        staffName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
        ordersCount: sql<number>`count(${orders.id})::int`,
        grossRevenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
        netRevenue: sql<number>`coalesce(sum(${orders.subtotal}::numeric), 0)::float`,
        discountTotal: sql<number>`coalesce(sum(${orders.discountTotal}::numeric), 0)::float`,
      })
      .from(orders)
      .innerJoin(
        users,
        and(
          sql`${users.id} = COALESCE(${orders.cashierId}, ${orders.waiterId})`,
          eq(users.tenantId, tenantId)
        )
      )
      .where(and(...validOrderConditions))
      .groupBy(users.id, users.firstName, users.lastName, users.role)
      .orderBy(desc(sql`sum(${orders.total}::numeric)`))
      .limit(20),

    // 11. Multi-Branch Performance Comparison (always spans all authorized branches)
    db
      .select({
        branchId: branches.id,
        branchName: branches.name,
        branchCode: branches.code,
        ordersCount: sql<number>`count(${orders.id})::int`,
        grossRevenue: sql<number>`coalesce(sum(${orders.total}::numeric), 0)::float`,
        netRevenue: sql<number>`coalesce(sum(${orders.subtotal}::numeric), 0)::float`,
        discountTotal: sql<number>`coalesce(sum(${orders.discountTotal}::numeric), 0)::float`,
      })
      .from(branches)
      .leftJoin(
        orders,
        and(eq(orders.branchId, branches.id), ...branchMatrixOrderConditions)
      )
      .where(
        and(
          eq(branches.tenantId, tenantId),
          eq(branches.isActive, true),
          authorizedBranchFilter(branches.id)
        )
      )
      .groupBy(branches.id, branches.name, branches.code)
      .orderBy(desc(sql`coalesce(sum(${orders.total}::numeric), 0)`)),

    // 12. Floor plan utilization
    db
      .select({
        totalSeats: sql<number>`coalesce(sum(${restaurantTables.capacity}), 0)::int`,
        occupiedSeats: sql<number>`coalesce(sum(case when ${restaurantTables.status} = 'Occupied' then ${restaurantTables.capacity} else 0 end), 0)::int`,
        availableTables: sql<number>`count(case when ${restaurantTables.status} = 'Available' then 1 end)::int`,
        occupiedTables: sql<number>`count(case when ${restaurantTables.status} = 'Occupied' then 1 end)::int`,
        reservedTables: sql<number>`count(case when ${restaurantTables.status} = 'Reserved' then 1 end)::int`,
        cleaningTables: sql<number>`count(case when ${restaurantTables.status} = 'Cleaning' then 1 end)::int`,
      })
      .from(restaurantTables)
      .where(and(eq(restaurantTables.tenantId, tenantId), branchFilter(restaurantTables.branchId))),

    // 13. Active reservations
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.tenantId, tenantId),
          inArray(reservations.status, ['Pending', 'Confirmed', 'Checked-In']),
          branchFilter(reservations.branchId)
        )
      ),

    // 14. Waitlist count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.tenantId, tenantId),
          inArray(waitlistEntries.status, ['Waiting', 'Notified']),
          branchFilter(waitlistEntries.branchId)
        )
      ),

    // 15. Active deliveries
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.tenantId, tenantId),
          inArray(deliveryAssignments.status, ['Assigned', 'Dispatched']),
          branchFilter(deliveryAssignments.branchId)
        )
      ),

    // 16. 86ed menu items
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuItemAvailability)
      .where(
        and(
          eq(menuItemAvailability.tenantId, tenantId),
          eq(menuItemAvailability.is86ed, true),
          branchFilter(menuItemAvailability.branchId)
        )
      ),

    // 17. Inventory valuation & par status
    db
      .select({
        totalSkus: sql<number>`count(*)::int`,
        totalValuation: sql<number>`coalesce(sum(${inventoryItems.currentStock}::numeric * ${inventoryItems.costPrice}::numeric), 0)::float`,
        depletedItemsCount: sql<number>`count(case when ${inventoryItems.currentStock}::numeric > 0 and ${inventoryItems.currentStock}::numeric <= ${inventoryItems.minThreshold}::numeric then 1 end)::int`,
        outOfStockCount: sql<number>`count(case when ${inventoryItems.currentStock}::numeric <= 0 then 1 end)::int`,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.tenantId, tenantId),
          eq(inventoryItems.isActive, true),
          branchFilter(inventoryItems.branchId)
        )
      ),

    // 18. Expiring batches
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventoryBatches)
      .where(
        and(
          eq(inventoryBatches.tenantId, tenantId),
          eq(inventoryBatches.status, 'ACTIVE'),
          sql`${inventoryBatches.currentQuantity}::numeric > 0`,
          lte(inventoryBatches.expiryDate, expiryCutoff),
          branchFilter(inventoryBatches.branchId)
        )
      ),

    // 19. Waste & spoilage
    db
      .select({
        wasteLossAmount: sql<number>`coalesce(sum(${wasteLogs.totalLossCost}::numeric), 0)::float`,
        wasteIncidentsCount: sql<number>`count(*)::int`,
      })
      .from(wasteLogs)
      .where(
        and(
          eq(wasteLogs.tenantId, tenantId),
          gte(wasteLogs.loggedAt, start),
          lte(wasteLogs.loggedAt, end),
          branchFilter(wasteLogs.branchId)
        )
      ),

    // 20. Active stock transfers
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockTransfers)
      .where(
        and(
          eq(stockTransfers.tenantId, tenantId),
          inArray(stockTransfers.status, ['PENDING', 'APPROVED', 'IN_TRANSIT'])
        )
      ),

    // 21. Open physical stock counts
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockCounts)
      .where(
        and(
          eq(stockCounts.tenantId, tenantId),
          inArray(stockCounts.status, ['IN_PROGRESS', 'PENDING_APPROVAL']),
          branchFilter(stockCounts.branchId)
        )
      ),

    // 22. Pending purchase requisitions
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.tenantId, tenantId),
          eq(purchaseRequests.status, 'PENDING'),
          branchFilter(purchaseRequests.branchId)
        )
      ),

    // 23. Open purchase orders
    db
      .select({
        count: sql<number>`count(*)::int`,
        commitment: sql<number>`coalesce(sum(${purchaseOrders.totalAmount}::numeric), 0)::float`,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          inArray(purchaseOrders.status, ['DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED']),
          branchFilter(purchaseOrders.branchId)
        )
      ),

    // 24. Unpaid supplier invoices
    db
      .select({
        count: sql<number>`count(*)::int`,
        balance: sql<number>`coalesce(sum(${supplierInvoices.totalAmount}::numeric - ${supplierInvoices.paidAmount}::numeric), 0)::float`,
      })
      .from(supplierInvoices)
      .where(
        and(
          eq(supplierInvoices.tenantId, tenantId),
          inArray(supplierInvoices.status, ['UNPAID', 'PARTIALLY_PAID']),
          branchFilter(supplierInvoices.branchId)
        )
      ),

    // 25. Pending supplier returns
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(supplierReturns)
      .where(
        and(
          eq(supplierReturns.tenantId, tenantId),
          inArray(supplierReturns.status, ['PENDING_DISPATCH', 'DISPATCHED']),
          branchFilter(supplierReturns.branchId)
        )
      ),

    // 26. Open cash drawers
    db
      .select({
        drawerName: cashDrawers.name,
        openingFloat: drawerSessions.openingFloat,
        expectedClosing: drawerSessions.expectedClosingBalance,
      })
      .from(drawerSessions)
      .innerJoin(
        cashDrawers,
        and(eq(drawerSessions.drawerId, cashDrawers.id), eq(cashDrawers.tenantId, tenantId))
      )
      .where(
        and(
          eq(drawerSessions.tenantId, tenantId),
          inArray(drawerSessions.status, ['OPEN', 'ACTIVE']),
          branchFilter(cashDrawers.branchId)
        )
      ),

    // 27. Cashier shifts
    db
      .select({
        openShiftsCount: sql<number>`count(case when ${cashierShifts.status} = 'OPEN' then 1 end)::int`,
        closedShiftsCount: sql<number>`count(case when ${cashierShifts.status} = 'CLOSED' then 1 end)::int`,
        netShiftVariance: sql<number>`coalesce(sum(${cashierShifts.variance}::numeric), 0)::float`,
      })
      .from(cashierShifts)
      .where(
        and(
          eq(cashierShifts.tenantId, tenantId),
          gte(cashierShifts.openedAt, start),
          lte(cashierShifts.openedAt, end),
          branchFilter(cashierShifts.branchId)
        )
      ),

    // 28. Corporate expenses
    db
      .select({
        pendingCount: sql<number>`count(case when ${expenses.status} = 'SUBMITTED' then 1 end)::int`,
        approvedTotal: sql<number>`coalesce(sum(case when ${expenses.status} in ('APPROVED', 'PAID_DISBURSED') then ${expenses.totalAmount}::numeric else 0 end), 0)::float`,
      })
      .from(expenses)
      .where(and(eq(expenses.tenantId, tenantId), branchFilter(expenses.branchId))),

    // 29. Pending GL adjustments
    db
      .select({
        count: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${financialAdjustments.amount}::numeric), 0)::float`,
      })
      .from(financialAdjustments)
      .where(
        and(
          eq(financialAdjustments.tenantId, tenantId),
          eq(financialAdjustments.status, 'PENDING_APPROVAL'),
          branchFilter(financialAdjustments.branchId)
        )
      ),

    // 30. Unallocated M-Pesa callbacks
    db
      .select({
        count: sql<number>`count(*)::int`,
        amount: sql<number>`coalesce(sum(${mpesaC2bCallbacks.transAmount}::numeric - ${mpesaC2bCallbacks.allocatedAmount}::numeric), 0)::float`,
      })
      .from(mpesaC2bCallbacks)
      .where(
        and(
          eq(mpesaC2bCallbacks.tenantId, tenantId),
          inArray(mpesaC2bCallbacks.allocationStatus, ['UNALLOCATED', 'PARTIALLY_ALLOCATED']),
          branchFilter(mpesaC2bCallbacks.branchId)
        )
      ),

    // 31. KRA eTIMS fiscal invoices
    db
      .select({
        fiscalizedCount: sql<number>`count(case when ${fiscalInvoices.fiscalStatus} = 'FISCALIZED' then 1 end)::int`,
        pendingCount: sql<number>`count(case when ${fiscalInvoices.fiscalStatus} in ('PENDING', 'FAILED') then 1 end)::int`,
      })
      .from(fiscalInvoices)
      .where(
        and(
          eq(fiscalInvoices.tenantId, tenantId),
          gte(fiscalInvoices.createdAt, start),
          lte(fiscalInvoices.createdAt, end),
          branchFilter(fiscalInvoices.branchId)
        )
      ),

    // 32. Tender breakdown
    db
      .select({
        method: payments.paymentMethod,
        amount: sql<number>`coalesce(sum(${payments.amount}::numeric), 0)::float`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.tenantId, tenantId),
          eq(payments.paymentFlow, 'INBOUND_AR'),
          eq(payments.isReversed, false),
          gte(payments.createdAt, start),
          lte(payments.createdAt, end),
          branchFilter(payments.branchId),
          params.paymentMethod ? eq(payments.paymentMethod, params.paymentMethod) : undefined
        )
      )
      .groupBy(payments.paymentMethod)
      .orderBy(desc(sql`sum(${payments.amount}::numeric)`)),

    // 33. Offline sync telemetry
    db
      .select({
        batchesCount: sql<number>`count(*)::int`,
        reconciledOrders: sql<number>`coalesce(sum(${offlineSyncBatches.recordCount}), 0)::int`,
        conflictsCount: sql<number>`coalesce(sum(${offlineSyncBatches.conflictCount}), 0)::int`,
        avgLatencyMs: sql<number>`coalesce(avg(${offlineSyncBatches.syncDurationMs}), 0)::float`,
        lastSyncAt: sql<string | null>`max(${offlineSyncBatches.completedAt})`,
      })
      .from(offlineSyncBatches)
      .where(
        and(
          eq(offlineSyncBatches.tenantId, tenantId),
          branchFilter(offlineSyncBatches.branchId)
        )
      ),

    // 34. Loyalty membership pool
    db
      .select({
        enrolledMembersCount: sql<number>`count(*)::int`,
        activePointsPool: sql<number>`coalesce(sum(${customerLoyaltyProfiles.currentPoints}), 0)::int`,
      })
      .from(customerLoyaltyProfiles)
      .where(eq(customerLoyaltyProfiles.tenantId, tenantId)),

    // 35. Recent audit stream
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        module: auditLogs.module,
        entityType: auditLogs.entityType,
        actorName: sql<string | null>`NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), '')`,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, and(eq(auditLogs.userId, users.id), eq(users.tenantId, tenantId)))
      .where(and(eq(auditLogs.tenantId, tenantId), branchFilter(auditLogs.branchId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(6),

    // 36. Live staff filter options
    db
      .select({
        id: users.id,
        name: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.firstName)),

    // 37. Authorized branch filter options (NEVER narrowed by selected branchId)
    db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
      })
      .from(branches)
      .where(
        and(
          eq(branches.tenantId, tenantId),
          eq(branches.isActive, true),
          authorizedBranchFilter(branches.id)
        )
      )
      .orderBy(asc(branches.name)),

    // 38. Distinct channels
    db
      .selectDistinct({ orderType: orders.orderType })
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(asc(orders.orderType)),

    // 39. Distinct payment methods
    db
      .selectDistinct({ paymentMethod: payments.paymentMethod })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), eq(payments.paymentFlow, 'INBOUND_AR')))
      .orderBy(asc(payments.paymentMethod)),
  ]);

  const grossRevenue = Number(finRow?.grossRevenue ?? 0);
  const netRevenue = Number(finRow?.netRevenue ?? 0);
  const totalCogs = Number(cogsRow?.totalCogs ?? 0);
  const grossProfit = Math.max(0, netRevenue - totalCogs);
  const grossMarginPercent =
    netRevenue > 0 ? Number(((grossProfit / netRevenue) * 100).toFixed(1)) : 0;
  const validOrderCount = Number(finRow?.orderCount ?? 0);
  const averageOrderValue =
    validOrderCount > 0 ? Number((grossRevenue / validOrderCount).toFixed(2)) : 0;

  // Comparison calculations
  let comparison: {
    mode: DashboardAnalyticsQuery['compareMode'];
    label: string;
    periodStart: string;
    periodEnd: string;
    previous: {
      grossRevenue: number;
      netRevenue: number;
      totalCogs: number;
      grossProfit: number;
      grossMarginPercent: number;
      totalOrders: number;
      averageOrderValue: number;
      discountTotal: number;
    };
    deltas: {
      grossRevenuePct: number | null;
      netRevenuePct: number | null;
      grossMarginPts: number;
      ordersPct: number | null;
      aovPct: number | null;
      discountPct: number | null;
    };
  } | null = null;

  if (comparisonRange) {
    const prevFin = prevFinRows[0];
    const prevCogs = Number(prevCogsRows[0]?.totalCogs ?? 0);
    const prevGross = Number(prevFin?.grossRevenue ?? 0);
    const prevNet = Number(prevFin?.netRevenue ?? 0);
    const prevOrders = Number(prevFin?.orderCount ?? 0);
    const prevDiscount = Number(prevFin?.discountTotal ?? 0);
    const prevProfit = Math.max(0, prevNet - prevCogs);
    const prevMarginPct =
      prevNet > 0 ? Number(((prevProfit / prevNet) * 100).toFixed(1)) : 0;
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
  const expectedClosing = openDrawerRows.reduce(
    (s, r) => s + (parseFloat(r.expectedClosing) || 0),
    0
  );

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
      const marginPct =
        p.revenue > 0 ? Number((((p.revenue - p.cogs) / p.revenue) * 100).toFixed(1)) : 0;
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
      const discountRate =
        s.grossRevenue + s.discountTotal > 0
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
      averageOrderValue:
        b.ordersCount > 0 ? Number((b.grossRevenue / b.ordersCount).toFixed(2)) : 0,
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