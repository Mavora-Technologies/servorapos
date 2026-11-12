import { eq, and, sql, gte, lte, desc, or, isNull } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  menuItemAvailability,
  restaurantTables,
  reservations,
  waitlistEntries,
  deliveryAssignments,
  inventoryItems,
  inventoryBatches,
  wasteLogs,
  stockTransfers,
  stockCounts,
  purchaseRequests,
  purchaseOrders,
  supplierInvoices,
  supplierReturns,
  payments,
  mpesaC2bCallbacks,
  cashDrawers,
  drawerSessions,
  cashierShifts,
  expenses,
  financialAdjustments,
  customerLoyaltyProfiles,
  loyaltyTransactionsLedger,
  fiscalInvoices,
  auditLogs,
  users,
} from '../config/schema';

export interface DashboardAnalyticsFilter {
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  branchId?: number | null;
  orderType?: string;
}

export const getExecutiveDashboardMetrics = async (
  tenantId: number,
  filters: DashboardAnalyticsFilter
) => {
  const now = new Date();
  let startDate = new Date();
  let endDate: Date | null = null;

  if (filters.startDate) {
    startDate = new Date(`${filters.startDate}T00:00:00.000Z`);
    if (filters.endDate) {
      endDate = new Date(`${filters.endDate}T23:59:59.999Z`);
    }
  } else {
    const tf = filters.timeframe || 'today';
    if (tf === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (tf === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (tf === '7days') {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (tf === '30days') {
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }
  }

  const branchId = filters.branchId || null;
  const branchScope = (col: any) => (branchId ? eq(col, branchId) : undefined);

  const orderConditions = [
    eq(orders.tenantId, tenantId),
    gte(orders.createdAt, startDate),
    ...(endDate ? [lte(orders.createdAt, endDate)] : []),
    ...(branchId ? [eq(orders.branchId, branchId)] : []),
    ...(filters.orderType && filters.orderType !== 'ALL'
      ? [eq(orders.orderType, filters.orderType)]
      : []),
  ];

  // 1. Financials, Tax & Order Pipeline Aggregation
  const [salesSummary] = await db
    .select({
      grossRevenue: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
      netRevenue: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.subtotal} AS NUMERIC) ELSE 0 END), 0)`,
      totalTax: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.tax} AS NUMERIC) ELSE 0 END), 0)`,
      cateringLevy: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.cateringLevy} AS NUMERIC) ELSE 0 END), 0)`,
      discountTotal: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.discountTotal} AS NUMERIC) ELSE 0 END), 0)`,
      totalOrders: sql<number>`COUNT(${orders.id})`,
      completedOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'Completed' THEN 1 END)`,
      kitchenQueue: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('Confirmed', 'Preparing', 'Ready', 'Sent-To-Kitchen') THEN 1 END)`,
      cancelledOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'Cancelled' THEN 1 END)`,
    })
    .from(orders)
    .where(and(...orderConditions));

  const grossNum = parseFloat(salesSummary.grossRevenue) || 0;
  const netNum = parseFloat(salesSummary.netRevenue) || 0;
  const taxNum = parseFloat(salesSummary.totalTax) || 0;
  const levyNum = parseFloat(salesSummary.cateringLevy) || 0;
  const discountNum = parseFloat(salesSummary.discountTotal) || 0;
  const activeOrdersCount =
    (Number(salesSummary.totalOrders) || 0) - (Number(salesSummary.cancelledOrders) || 0);
  const avgTicketValue =
    activeOrdersCount > 0 ? Number((grossNum / activeOrdersCount).toFixed(2)) : 0;

  // 2. Time-Series Sales & Order Velocity (Hourly for 1-day views, Daily for multi-day views)
  const isMultiDay =
    filters.timeframe === '7days' ||
    filters.timeframe === '30days' ||
    (filters.startDate && filters.endDate && filters.startDate !== filters.endDate);

  const timeBucketSql = isMultiDay
    ? sql<string>`TO_CHAR(${orders.createdAt}, 'Mon DD')`
    : sql<string>`TO_CHAR(${orders.createdAt}, 'HH24:00')`;

  const hourlyTrendRaw = await db
    .select({
      timeBucket: timeBucketSql,
      sales: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
      ordersCount: sql<number>`COUNT(${orders.id})`,
    })
    .from(orders)
    .where(and(...orderConditions))
    .groupBy(timeBucketSql)
    .orderBy(sql`MIN(${orders.createdAt})`);

  const salesTrend = hourlyTrendRaw.map((r) => ({
    time: r.timeBucket,
    sales: parseFloat(r.sales) || 0,
    orders: Number(r.ordersCount) || 0,
  }));

  // 3. Channel Breakdown
  const channelBreakdownRaw = await db
    .select({
      orderType: orders.orderType,
      revenue: sql<string>`COALESCE(SUM(CASE WHEN UPPER(${orders.status}) != 'CANCELLED' THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
      orderCount: sql<number>`COUNT(${orders.id})`,
    })
    .from(orders)
    .where(and(...orderConditions))
    .groupBy(orders.orderType);

  const channelBreakdown = channelBreakdownRaw.map((c) => ({
    type: c.orderType,
    revenue: parseFloat(c.revenue) || 0,
    orders: Number(c.orderCount) || 0,
  }));

  // 4. Top Selling Menu Items
  const topSellingRaw = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      station: menuItems.kitchenStation,
      quantitySold: sql<string>`COALESCE(SUM(CAST(${orderItems.quantity} AS NUMERIC)), 0)`,
      revenue: sql<string>`COALESCE(SUM(CAST(${orderItems.totalPrice} AS NUMERIC)), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(and(...orderConditions, sql`UPPER(${orders.status}) != 'CANCELLED'`))
    .groupBy(menuItems.id, menuItems.name, menuItems.kitchenStation)
    .orderBy(desc(sql`SUM(CAST(${orderItems.totalPrice} AS NUMERIC))`))
    .limit(6);

  const topProducts = topSellingRaw.map((item) => ({
    id: item.id,
    name: item.name,
    station: item.station,
    quantity: parseFloat(item.quantitySold) || 0,
    revenue: parseFloat(item.revenue) || 0,
  }));

  // 5. Front-of-House: Floor Tables, Reservations, Waitlist, 3PL & 86ed Items (Branch-Scoped)
  const tableStatsRaw = await db
    .select({
      status: restaurantTables.status,
      count: sql<number>`COUNT(${restaurantTables.id})`,
      seats: sql<number>`COALESCE(SUM(${restaurantTables.capacity}), 0)`,
    })
    .from(restaurantTables)
    .where(and(eq(restaurantTables.tenantId, tenantId), branchScope(restaurantTables.branchId)))
    .groupBy(restaurantTables.status);

  let totalSeats = 0;
  let occupiedSeats = 0;
  let availableTables = 0;
  let occupiedTables = 0;
  let reservedTables = 0;
  let cleaningTables = 0;

  tableStatsRaw.forEach((t) => {
    totalSeats += Number(t.seats);
    if (t.status === 'Occupied') {
      occupiedSeats += Number(t.seats);
      occupiedTables += Number(t.count);
    } else if (t.status === 'Available') {
      availableTables += Number(t.count);
    } else if (t.status === 'Reserved') {
      reservedTables += Number(t.count);
    } else if (t.status === 'Cleaning') {
      cleaningTables += Number(t.count);
    }
  });

  const floorUtilizationRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  const [[activeResCount], [waitingGuestsCount], [activeDeliveriesCount], [items86edCount]] =
    await Promise.all([
      db
        .select({ count: sql<number>`COUNT(${reservations.id})` })
        .from(reservations)
        .where(
          and(
            eq(reservations.tenantId, tenantId),
            branchScope(reservations.branchId),
            sql`${reservations.status} IN ('Pending', 'Confirmed', 'Checked-In')`
          )
        ),
      db
        .select({ count: sql<number>`COUNT(${waitlistEntries.id})` })
        .from(waitlistEntries)
        .where(
          and(
            eq(waitlistEntries.tenantId, tenantId),
            branchScope(waitlistEntries.branchId),
            eq(waitlistEntries.status, 'Waiting')
          )
        ),
      db
        .select({ count: sql<number>`COUNT(${deliveryAssignments.id})` })
        .from(deliveryAssignments)
        .where(
          and(
            eq(deliveryAssignments.tenantId, tenantId),
            branchScope(deliveryAssignments.branchId),
            sql`${deliveryAssignments.status} IN ('Assigned', 'Dispatched')`
          )
        ),
      db
        .select({ count: sql<number>`COUNT(${menuItemAvailability.id})` })
        .from(menuItemAvailability)
        .where(
          and(
            eq(menuItemAvailability.tenantId, tenantId),
            branchScope(menuItemAvailability.branchId),
            eq(menuItemAvailability.is86ed, true)
          )
        ),
    ]);

  // 6. Supply Chain & Warehouse (Branch-Scoped)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const [
    [inventorySummary],
    [expiringBatches],
    [wasteSummary],
    [activeTransfers],
    [openAudits],
  ] = await Promise.all([
    db
      .select({
        totalValuation: sql<string>`COALESCE(SUM(CAST(${inventoryItems.currentStock} AS NUMERIC) * CAST(${inventoryItems.costPrice} AS NUMERIC)), 0)`,
        lowStockCount: sql<number>`COUNT(CASE WHEN CAST(${inventoryItems.currentStock} AS NUMERIC) <= CAST(${inventoryItems.minThreshold} AS NUMERIC) AND CAST(${inventoryItems.currentStock} AS NUMERIC) > 0 THEN 1 END)`,
        outOfStockCount: sql<number>`COUNT(CASE WHEN CAST(${inventoryItems.currentStock} AS NUMERIC) <= 0 THEN 1 END)`,
        totalSkus: sql<number>`COUNT(${inventoryItems.id})`,
      })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.tenantId, tenantId), branchScope(inventoryItems.branchId))),
    db
      .select({ count: sql<number>`COUNT(${inventoryBatches.id})` })
      .from(inventoryBatches)
      .where(
        and(
          eq(inventoryBatches.tenantId, tenantId),
          branchScope(inventoryBatches.branchId),
          eq(inventoryBatches.status, 'ACTIVE'),
          sql`${inventoryBatches.expiryDate} <= ${sevenDaysFromNow}`
        )
      ),
    db
      .select({
        totalLoss: sql<string>`COALESCE(SUM(CAST(${wasteLogs.totalLossCost} AS NUMERIC)), 0)`,
        incidents: sql<number>`COUNT(${wasteLogs.id})`,
      })
      .from(wasteLogs)
      .where(
        and(
          eq(wasteLogs.tenantId, tenantId),
          branchScope(wasteLogs.branchId),
          gte(wasteLogs.loggedAt, startDate)
        )
      ),
    db
      .select({ count: sql<number>`COUNT(${stockTransfers.id})` })
      .from(stockTransfers)
      .where(
        and(
          eq(stockTransfers.tenantId, tenantId),
          branchId
            ? or(
                eq(stockTransfers.sourceBranchId, branchId),
                eq(stockTransfers.destinationBranchId, branchId)
              )
            : undefined,
          sql`${stockTransfers.status} IN ('PENDING', 'APPROVED', 'IN_TRANSIT')`
        )
      ),
    db
      .select({ count: sql<number>`COUNT(${stockCounts.id})` })
      .from(stockCounts)
      .where(
        and(
          eq(stockCounts.tenantId, tenantId),
          branchScope(stockCounts.branchId),
          sql`${stockCounts.status} IN ('IN_PROGRESS', 'PENDING_APPROVAL')`
        )
      ),
  ]);

  // 7. Procure-to-Pay (Branch-Scoped)
  const [[prStats], [poStats], [apInvoiceStats], [returnStats]] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(${purchaseRequests.id})` })
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.tenantId, tenantId),
          branchScope(purchaseRequests.branchId),
          eq(purchaseRequests.status, 'PENDING')
        )
      ),
    db
      .select({
        openCount: sql<number>`COUNT(${purchaseOrders.id})`,
        openCommitment: sql<string>`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS NUMERIC)), 0)`,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          branchScope(purchaseOrders.branchId),
          sql`${purchaseOrders.status} IN ('ISSUED', 'PARTIALLY_RECEIVED')`
        )
      ),
    db
      .select({
        unpaidCount: sql<number>`COUNT(${supplierInvoices.id})`,
        outstandingPayable: sql<string>`COALESCE(SUM(CAST(${supplierInvoices.totalAmount} AS NUMERIC) - CAST(${supplierInvoices.paidAmount} AS NUMERIC)), 0)`,
      })
      .from(supplierInvoices)
      .where(
        and(
          eq(supplierInvoices.tenantId, tenantId),
          branchScope(supplierInvoices.branchId),
          sql`${supplierInvoices.status} IN ('UNPAID', 'PARTIALLY_PAID', 'DISPUTED')`
        )
      ),
    db
      .select({ count: sql<number>`COUNT(${supplierReturns.id})` })
      .from(supplierReturns)
      .where(
        and(
          eq(supplierReturns.tenantId, tenantId),
          branchScope(supplierReturns.branchId),
          eq(supplierReturns.status, 'PENDING_DISPATCH')
        )
      ),
  ]);

  // 8. Treasury, Cash Drawers, Cashier Shifts, Expenses, Adjustments & Loyalty
  const activeSessions = await db
    .select({
      drawerId: cashDrawers.id,
      drawerName: cashDrawers.name,
      drawerCode: cashDrawers.drawerCode,
      openingFloat: drawerSessions.openingFloat,
      cashSalesTotal: drawerSessions.cashSalesTotal,
      expectedClosing: drawerSessions.expectedClosingBalance,
    })
    .from(drawerSessions)
    .innerJoin(cashDrawers, eq(drawerSessions.drawerId, cashDrawers.id))
    .where(
      and(
        eq(drawerSessions.tenantId, tenantId),
        branchScope(cashDrawers.branchId),
        sql`${drawerSessions.status} != 'CLOSED_RECONCILED'`
      )
    )
    .orderBy(desc(drawerSessions.openedAt));

  const primarySession = activeSessions[0] || null;
  const totalActiveTillBalance = activeSessions.reduce(
    (sum, s) => sum + (parseFloat(s.expectedClosing) || 0),
    0
  );

  const [
    [shiftStats],
    [expenseStats],
    [adjustmentStats],
    [loyaltyStats],
    [unallocatedMpesa],
    [fiscalStats],
    tenderBreakdownRaw,
    recentAuditRaw,
  ] = await Promise.all([
    db
      .select({
        openShiftsCount: sql<number>`COUNT(CASE WHEN ${cashierShifts.status} = 'OPEN' THEN 1 END)::int`,
        closedShiftsCount: sql<number>`COUNT(CASE WHEN ${cashierShifts.status} = 'CLOSED' THEN 1 END)::int`,
        netShiftVariance: sql<string>`COALESCE(SUM(CASE WHEN ${cashierShifts.status} = 'CLOSED' THEN CAST(${cashierShifts.variance} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(cashierShifts)
      .where(
        and(
          eq(cashierShifts.tenantId, tenantId),
          branchScope(cashierShifts.branchId),
          gte(cashierShifts.openedAt, startDate)
        )
      ),

    db
      .select({
        pendingCount: sql<number>`COUNT(CASE WHEN ${expenses.status} = 'SUBMITTED' THEN 1 END)::int`,
        approvedTotal: sql<string>`COALESCE(SUM(CASE WHEN ${expenses.status} IN ('APPROVED', 'PAID_DISBURSED') THEN CAST(${expenses.totalAmount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.tenantId, tenantId),
          branchScope(expenses.branchId),
          gte(expenses.createdAt, startDate)
        )
      ),

    db
      .select({
        pendingCount: sql<number>`COUNT(CASE WHEN ${financialAdjustments.status} = 'PENDING_APPROVAL' THEN 1 END)::int`,
        pendingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${financialAdjustments.status} = 'PENDING_APPROVAL' THEN CAST(${financialAdjustments.amount} AS NUMERIC) ELSE 0 END), 0)`,
      })
      .from(financialAdjustments)
      .where(and(eq(financialAdjustments.tenantId, tenantId), branchScope(financialAdjustments.branchId))),

    db
      .select({
        enrolledCount: sql<number>`COUNT(${customerLoyaltyProfiles.id})::int`,
        activePointsPool: sql<number>`COALESCE(SUM(${customerLoyaltyProfiles.currentPoints}), 0)::int`,
      })
      .from(customerLoyaltyProfiles)
      .where(eq(customerLoyaltyProfiles.tenantId, tenantId)),

    db
      .select({
        count: sql<number>`COUNT(${mpesaC2bCallbacks.id})`,
        amount: sql<string>`COALESCE(SUM(CAST(${mpesaC2bCallbacks.transAmount} AS NUMERIC)), 0)`,
      })
      .from(mpesaC2bCallbacks)
      .where(
        and(
          eq(mpesaC2bCallbacks.tenantId, tenantId),
          branchScope(mpesaC2bCallbacks.branchId),
          eq(mpesaC2bCallbacks.allocationStatus, 'UNALLOCATED')
        )
      ),

    db
      .select({
        fiscalizedCount: sql<number>`COUNT(CASE WHEN ${fiscalInvoices.fiscalStatus} = 'FISCALIZED' THEN 1 END)`,
        pendingOrFailedCount: sql<number>`COUNT(CASE WHEN ${fiscalInvoices.fiscalStatus} IN ('PENDING', 'FAILED') THEN 1 END)`,
      })
      .from(fiscalInvoices)
      .where(and(eq(fiscalInvoices.tenantId, tenantId), branchScope(fiscalInvoices.branchId))),

    db
      .select({
        method: payments.paymentMethod,
        amount: sql<string>`COALESCE(SUM(CAST(${payments.amount} AS NUMERIC)), 0)`,
      })
      .from(payments)
      .where(
        and(
          eq(payments.tenantId, tenantId),
          branchScope(payments.branchId),
          eq(payments.paymentFlow, 'INBOUND_AR'),
          eq(payments.isReversed, false),
          gte(payments.createdAt, startDate)
        )
      )
      .groupBy(payments.paymentMethod),

    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        module: auditLogs.module,
        entityType: auditLogs.entityType,
        actorName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.tenantId, tenantId), branchScope(auditLogs.branchId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(6),
  ]);

  return {
    financials: {
      grossRevenue: grossNum,
      netRevenue: netNum,
      totalTax: taxNum,
      cateringLevy: levyNum,
      discountTotal: discountNum,
      averageOrderValue: avgTicketValue,
    },
    orders: {
      totalOrders: Number(salesSummary.totalOrders) || 0,
      completedOrders: Number(salesSummary.completedOrders) || 0,
      kitchenQueue: Number(salesSummary.kitchenQueue) || 0,
      cancelledOrders: Number(salesSummary.cancelledOrders) || 0,
      activeDeliveries: Number(activeDeliveriesCount?.count) || 0,
    },
    floorPlan: {
      totalSeats,
      occupiedSeats,
      utilizationRate: floorUtilizationRate,
      availableTables,
      occupiedTables,
      reservedTables,
      cleaningTables,
      activeReservations: Number(activeResCount?.count) || 0,
      waitlistCount: Number(waitingGuestsCount?.count) || 0,
      items86edCount: Number(items86edCount?.count) || 0,
    },
    inventory: {
      totalSkus: Number(inventorySummary?.totalSkus) || 0,
      totalValuation: parseFloat(inventorySummary?.totalValuation || '0') || 0,
      depletedItemsCount: Number(inventorySummary?.lowStockCount) || 0,
      outOfStockCount: Number(inventorySummary?.outOfStockCount) || 0,
      expiringBatchesCount: Number(expiringBatches?.count) || 0,
      wasteLossAmount: parseFloat(wasteSummary?.totalLoss || '0') || 0,
      wasteIncidentsCount: Number(wasteSummary?.incidents) || 0,
      activeTransfersCount: Number(activeTransfers?.count) || 0,
      openStockCounts: Number(openAudits?.count) || 0,
    },
    procurement: {
      pendingRequisitions: Number(prStats?.count) || 0,
      openPurchaseOrders: Number(poStats?.openCount) || 0,
      openPoCommitment: parseFloat(poStats?.openCommitment || '0') || 0,
      unpaidInvoicesCount: Number(apInvoiceStats?.unpaidCount) || 0,
      accountsPayableBalance: parseFloat(apInvoiceStats?.outstandingPayable || '0') || 0,
      pendingSupplierReturns: Number(returnStats?.count) || 0,
    },
    treasury: {
      hasActiveSession: activeSessions.length > 0,
      activeDrawersCount: activeSessions.length,
      drawerName: primarySession ? `${primarySession.drawerName} (${primarySession.drawerCode})` : null,
      openingFloat: primarySession ? parseFloat(primarySession.openingFloat) : 0,
      expectedClosing: Number(totalActiveTillBalance.toFixed(2)),
      openShiftsCount: Number(shiftStats?.openShiftsCount) || 0,
      closedShiftsCount: Number(shiftStats?.closedShiftsCount) || 0,
      netShiftVariance: parseFloat(shiftStats?.netShiftVariance || '0') || 0,
      pendingExpensesCount: Number(expenseStats?.pendingCount) || 0,
      approvedExpensesTotal: parseFloat(expenseStats?.approvedTotal || '0') || 0,
      pendingAdjustmentsCount: Number(adjustmentStats?.pendingCount) || 0,
      pendingAdjustmentsAmount: parseFloat(adjustmentStats?.pendingAmount || '0') || 0,
      unallocatedMpesaCount: Number(unallocatedMpesa?.count) || 0,
      unallocatedMpesaAmount: parseFloat(unallocatedMpesa?.amount || '0') || 0,
      etimsFiscalizedCount: Number(fiscalStats?.fiscalizedCount) || 0,
      etimsPendingCount: Number(fiscalStats?.pendingOrFailedCount) || 0,
      tenderBreakdown: tenderBreakdownRaw.map((t) => ({
        method: t.method,
        amount: parseFloat(t.amount) || 0,
      })),
    },
    loyalty: {
      enrolledMembersCount: Number(loyaltyStats?.enrolledCount) || 0,
      activePointsPool: Number(loyaltyStats?.activePointsPool) || 0,
    },
    salesTrend,
    channelBreakdown,
    topProducts,
    recentAudits: recentAuditRaw,
  };
};