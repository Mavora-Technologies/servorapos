// apps/api/src/controllers/analytics.controller.ts
import { Response } from 'express';
import { eq, and, sql, gte, desc } from 'drizzle-orm';
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
  fiscalInvoices,
  auditLogs,
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { timeframe = 'today', branchId } = req.query;

    // 1. Resolve Timeframe Boundaries
    const now = new Date();
    const startDate = new Date();

    if (timeframe === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'yesterday') {
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeframe === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    const parsedBranchId = branchId && branchId !== 'ALL' ? parseInt(branchId as string, 10) : null;

    const orderConditions = [
      eq(orders.tenantId, tenantId),
      gte(orders.createdAt, startDate),
      ...(parsedBranchId ? [eq(orders.branchId, parsedBranchId)] : []),
    ];

    // 2. Financials, Tax & Order Pipeline Aggregation
    const [salesSummary] = await db
      .select({
        grossRevenue: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        netRevenue: sql<string>`COALESCE(SUM(CAST(${orders.subtotal} AS NUMERIC)), 0)`,
        totalTax: sql<string>`COALESCE(SUM(CAST(${orders.tax} AS NUMERIC)), 0)`,
        cateringLevy: sql<string>`COALESCE(SUM(CAST(${orders.cateringLevy} AS NUMERIC)), 0)`,
        discountTotal: sql<string>`COALESCE(SUM(CAST(${orders.discountTotal} AS NUMERIC)), 0)`,
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
    const totalOrdersCount = Number(salesSummary.totalOrders) || 0;
    const avgTicketValue = totalOrdersCount > 0 ? Number((grossNum / totalOrdersCount).toFixed(2)) : 0;

    // 3. Time-Series Sales & Order Velocity
    const hourlyTrendRaw = await db
      .select({
        timeBucket: sql<string>`TO_CHAR(${orders.createdAt}, 'HH24:00')`,
        sales: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
        ordersCount: sql<number>`COUNT(${orders.id})`,
      })
      .from(orders)
      .where(and(...orderConditions))
      .groupBy(sql`TO_CHAR(${orders.createdAt}, 'HH24:00')`)
      .orderBy(sql`TO_CHAR(${orders.createdAt}, 'HH24:00')`);

    const salesTrend = hourlyTrendRaw.map((r) => ({
      time: r.timeBucket,
      sales: parseFloat(r.sales) || 0,
      orders: Number(r.ordersCount) || 0,
    }));

    // 4. Channel Breakdown (Dine-In, Takeaway, Delivery, Bar-Tab)
    const channelBreakdownRaw = await db
      .select({
        orderType: orders.orderType,
        revenue: sql<string>`COALESCE(SUM(CAST(${orders.total} AS NUMERIC)), 0)`,
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

    // 5. Top Selling Menu Items with COGS & Margin Snapshot
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
      .where(and(...orderConditions))
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

    // 6. Front-of-House: Floor Tables, Reservations, Waitlist, 3PL & 86ed Items
    const tableStatsRaw = await db
      .select({
        status: restaurantTables.status,
        count: sql<number>`COUNT(${restaurantTables.id})`,
        seats: sql<number>`COALESCE(SUM(${restaurantTables.capacity}), 0)`,
      })
      .from(restaurantTables)
      .where(eq(restaurantTables.tenantId, tenantId))
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

    const [[activeResCount], [waitingGuestsCount], [activeDeliveriesCount], [items86edCount]] = await Promise.all([
      db
        .select({ count: sql<number>`COUNT(${reservations.id})` })
        .from(reservations)
        .where(and(eq(reservations.tenantId, tenantId), sql`${reservations.status} IN ('Pending', 'Confirmed', 'Checked-In')`)),
      db
        .select({ count: sql<number>`COUNT(${waitlistEntries.id})` })
        .from(waitlistEntries)
        .where(and(eq(waitlistEntries.tenantId, tenantId), eq(waitlistEntries.status, 'Waiting'))),
      db
        .select({ count: sql<number>`COUNT(${deliveryAssignments.id})` })
        .from(deliveryAssignments)
        .where(and(eq(deliveryAssignments.tenantId, tenantId), sql`${deliveryAssignments.status} IN ('Assigned', 'Dispatched')`)),
      db
        .select({ count: sql<number>`COUNT(${menuItemAvailability.id})` })
        .from(menuItemAvailability)
        .where(and(eq(menuItemAvailability.tenantId, tenantId), eq(menuItemAvailability.is86ed, true))),
    ]);

    // 7. Supply Chain & Warehouse (Inventory Valuation, Low Stock, Expiring Batches, Waste, Transfers)
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
        .where(eq(inventoryItems.tenantId, tenantId)),
      db
        .select({ count: sql<number>`COUNT(${inventoryBatches.id})` })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.tenantId, tenantId),
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
        .where(and(eq(wasteLogs.tenantId, tenantId), gte(wasteLogs.loggedAt, startDate))),
      db
        .select({ count: sql<number>`COUNT(${stockTransfers.id})` })
        .from(stockTransfers)
        .where(and(eq(stockTransfers.tenantId, tenantId), sql`${stockTransfers.status} IN ('PENDING', 'APPROVED', 'IN_TRANSIT')`)),
      db
        .select({ count: sql<number>`COUNT(${stockCounts.id})` })
        .from(stockCounts)
        .where(and(eq(stockCounts.tenantId, tenantId), sql`${stockCounts.status} IN ('IN_PROGRESS', 'PENDING_APPROVAL')`)),
    ]);

    // 8. Procure-to-Pay (PRs, POs, AP Invoices, Supplier Returns)
    const [[prStats], [poStats], [apInvoiceStats], [returnStats]] = await Promise.all([
      db
        .select({ count: sql<number>`COUNT(${purchaseRequests.id})` })
        .from(purchaseRequests)
        .where(and(eq(purchaseRequests.tenantId, tenantId), eq(purchaseRequests.status, 'PENDING'))),
      db
        .select({
          openCount: sql<number>`COUNT(${purchaseOrders.id})`,
          openCommitment: sql<string>`COALESCE(SUM(CAST(${purchaseOrders.totalAmount} AS NUMERIC)), 0)`,
        })
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.tenantId, tenantId), sql`${purchaseOrders.status} IN ('ISSUED', 'PARTIALLY_RECEIVED')`)),
      db
        .select({
          unpaidCount: sql<number>`COUNT(${supplierInvoices.id})`,
          outstandingPayable: sql<string>`COALESCE(SUM(CAST(${supplierInvoices.totalAmount} AS NUMERIC) - CAST(${supplierInvoices.paidAmount} AS NUMERIC)), 0)`,
        })
        .from(supplierInvoices)
        .where(and(eq(supplierInvoices.tenantId, tenantId), sql`${supplierInvoices.status} IN ('UNPAID', 'PARTIALLY_PAID', 'DISPUTED')`)),
      db
        .select({ count: sql<number>`COUNT(${supplierReturns.id})` })
        .from(supplierReturns)
        .where(and(eq(supplierReturns.tenantId, tenantId), eq(supplierReturns.status, 'PENDING_DISPATCH'))),
    ]);

    // 9. Treasury, M-Pesa Daraja, Cash Drawers & KRA eTIMS Fiscal Status
    const [activeCashSession] = await db
      .select({
        drawerName: cashDrawers.name,
        openingFloat: drawerSessions.openingFloat,
        expectedClosing: drawerSessions.expectedClosingBalance,
      })
      .from(drawerSessions)
      .innerJoin(cashDrawers, eq(drawerSessions.drawerId, cashDrawers.id))
      .where(and(eq(drawerSessions.tenantId, tenantId), eq(drawerSessions.status, 'OPEN')))
      .limit(1);

    const [[unallocatedMpesa], [fiscalStats], tenderBreakdownRaw, recentAuditRaw] = await Promise.all([
      db
        .select({
          count: sql<number>`COUNT(${mpesaC2bCallbacks.id})`,
          amount: sql<string>`COALESCE(SUM(CAST(${mpesaC2bCallbacks.transAmount} AS NUMERIC)), 0)`,
        })
        .from(mpesaC2bCallbacks)
        .where(and(eq(mpesaC2bCallbacks.tenantId, tenantId), eq(mpesaC2bCallbacks.allocationStatus, 'UNALLOCATED'))),
      db
        .select({
          fiscalizedCount: sql<number>`COUNT(CASE WHEN ${fiscalInvoices.fiscalStatus} = 'FISCALIZED' THEN 1 END)`,
          pendingOrFailedCount: sql<number>`COUNT(CASE WHEN ${fiscalInvoices.fiscalStatus} IN ('PENDING', 'FAILED') THEN 1 END)`,
        })
        .from(fiscalInvoices)
        .where(eq(fiscalInvoices.tenantId, tenantId)),
      db
        .select({
          method: payments.paymentMethod,
          amount: sql<string>`COALESCE(SUM(CAST(${payments.amount} AS NUMERIC)), 0)`,
        })
        .from(payments)
        .where(and(eq(payments.tenantId, tenantId), gte(payments.createdAt, startDate)))
        .groupBy(payments.paymentMethod),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          module: auditLogs.module,
          entityType: auditLogs.entityType,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(6),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        financials: {
          grossRevenue: grossNum,
          netRevenue: netNum,
          totalTax: taxNum,
          cateringLevy: levyNum,
          discountTotal: discountNum,
          averageOrderValue: avgTicketValue,
        },
        orders: {
          totalOrders: totalOrdersCount,
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
          hasActiveSession: !!activeCashSession,
          drawerName: activeCashSession?.drawerName || null,
          openingFloat: activeCashSession ? parseFloat(activeCashSession.openingFloat) : 0,
          expectedClosing: activeCashSession ? parseFloat(activeCashSession.expectedClosing) : 0,
          unallocatedMpesaCount: Number(unallocatedMpesa?.count) || 0,
          unallocatedMpesaAmount: parseFloat(unallocatedMpesa?.amount || '0') || 0,
          etimsFiscalizedCount: Number(fiscalStats?.fiscalizedCount) || 0,
          etimsPendingCount: Number(fiscalStats?.pendingOrFailedCount) || 0,
          tenderBreakdown: tenderBreakdownRaw.map((t) => ({
            method: t.method,
            amount: parseFloat(t.amount) || 0,
          })),
        },
        salesTrend,
        channelBreakdown,
        topProducts,
        recentAudits: recentAuditRaw,
      },
    });
  } catch (error: any) {
    console.error('[Dashboard Analytics Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Analytics query failed' });
  }
};