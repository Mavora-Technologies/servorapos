"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardAnalytics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getDashboardAnalytics = async (req, res) => {
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
        }
        else if (timeframe === 'yesterday') {
            startDate.setDate(now.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
        }
        else if (timeframe === '7days') {
            startDate.setDate(now.getDate() - 7);
        }
        else if (timeframe === '30days') {
            startDate.setDate(now.getDate() - 30);
        }
        else {
            startDate.setHours(0, 0, 0, 0);
        }
        const parsedBranchId = branchId && branchId !== 'ALL' ? parseInt(branchId, 10) : null;
        const orderConditions = [
            (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
            (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, startDate),
            ...(parsedBranchId ? [(0, drizzle_orm_1.eq)(schema_1.orders.branchId, parsedBranchId)] : []),
        ];
        // 2. Financials, Tax & Order Pipeline Aggregation
        const [salesSummary] = await db_1.db
            .select({
            grossRevenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.total} AS NUMERIC)), 0)`,
            netRevenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.subtotal} AS NUMERIC)), 0)`,
            totalTax: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.tax} AS NUMERIC)), 0)`,
            cateringLevy: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.cateringLevy} AS NUMERIC)), 0)`,
            discountTotal: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.discountTotal} AS NUMERIC)), 0)`,
            totalOrders: (0, drizzle_orm_1.sql) `COUNT(${schema_1.orders.id})`,
            completedOrders: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_1.orders.status} = 'Completed' THEN 1 END)`,
            kitchenQueue: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_1.orders.status} IN ('Confirmed', 'Preparing', 'Ready', 'Sent-To-Kitchen') THEN 1 END)`,
            cancelledOrders: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_1.orders.status} = 'Cancelled' THEN 1 END)`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...orderConditions));
        const grossNum = parseFloat(salesSummary.grossRevenue) || 0;
        const netNum = parseFloat(salesSummary.netRevenue) || 0;
        const taxNum = parseFloat(salesSummary.totalTax) || 0;
        const levyNum = parseFloat(salesSummary.cateringLevy) || 0;
        const discountNum = parseFloat(salesSummary.discountTotal) || 0;
        const totalOrdersCount = Number(salesSummary.totalOrders) || 0;
        const avgTicketValue = totalOrdersCount > 0 ? Number((grossNum / totalOrdersCount).toFixed(2)) : 0;
        // 3. Time-Series Sales & Order Velocity
        const hourlyTrendRaw = await db_1.db
            .select({
            timeBucket: (0, drizzle_orm_1.sql) `TO_CHAR(${schema_1.orders.createdAt}, 'HH24:00')`,
            sales: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.total} AS NUMERIC)), 0)`,
            ordersCount: (0, drizzle_orm_1.sql) `COUNT(${schema_1.orders.id})`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...orderConditions))
            .groupBy((0, drizzle_orm_1.sql) `TO_CHAR(${schema_1.orders.createdAt}, 'HH24:00')`)
            .orderBy((0, drizzle_orm_1.sql) `TO_CHAR(${schema_1.orders.createdAt}, 'HH24:00')`);
        const salesTrend = hourlyTrendRaw.map((r) => ({
            time: r.timeBucket,
            sales: parseFloat(r.sales) || 0,
            orders: Number(r.ordersCount) || 0,
        }));
        // 4. Channel Breakdown (Dine-In, Takeaway, Delivery, Bar-Tab)
        const channelBreakdownRaw = await db_1.db
            .select({
            orderType: schema_1.orders.orderType,
            revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orders.total} AS NUMERIC)), 0)`,
            orderCount: (0, drizzle_orm_1.sql) `COUNT(${schema_1.orders.id})`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)(...orderConditions))
            .groupBy(schema_1.orders.orderType);
        const channelBreakdown = channelBreakdownRaw.map((c) => ({
            type: c.orderType,
            revenue: parseFloat(c.revenue) || 0,
            orders: Number(c.orderCount) || 0,
        }));
        // 5. Top Selling Menu Items with COGS & Margin Snapshot
        const topSellingRaw = await db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            station: schema_1.menuItems.kitchenStation,
            quantitySold: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orderItems.quantity} AS NUMERIC)), 0)`,
            revenue: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.orderItems.totalPrice} AS NUMERIC)), 0)`,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id))
            .innerJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)(...orderConditions))
            .groupBy(schema_1.menuItems.id, schema_1.menuItems.name, schema_1.menuItems.kitchenStation)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `SUM(CAST(${schema_1.orderItems.totalPrice} AS NUMERIC))`))
            .limit(6);
        const topProducts = topSellingRaw.map((item) => ({
            id: item.id,
            name: item.name,
            station: item.station,
            quantity: parseFloat(item.quantitySold) || 0,
            revenue: parseFloat(item.revenue) || 0,
        }));
        // 6. Front-of-House: Floor Tables, Reservations, Waitlist, 3PL & 86ed Items
        const tableStatsRaw = await db_1.db
            .select({
            status: schema_1.restaurantTables.status,
            count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.restaurantTables.id})`,
            seats: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.restaurantTables.capacity}), 0)`,
        })
            .from(schema_1.restaurantTables)
            .where((0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId))
            .groupBy(schema_1.restaurantTables.status);
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
            }
            else if (t.status === 'Available') {
                availableTables += Number(t.count);
            }
            else if (t.status === 'Reserved') {
                reservedTables += Number(t.count);
            }
            else if (t.status === 'Cleaning') {
                cleaningTables += Number(t.count);
            }
        });
        const floorUtilizationRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
        const [[activeResCount], [waitingGuestsCount], [activeDeliveriesCount], [items86edCount]] = await Promise.all([
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.reservations.id})` })
                .from(schema_1.reservations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.reservations.status} IN ('Pending', 'Confirmed', 'Checked-In')`)),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.waitlistEntries.id})` })
                .from(schema_1.waitlistEntries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.waitlistEntries.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.waitlistEntries.status, 'Waiting'))),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.deliveryAssignments.id})` })
                .from(schema_1.deliveryAssignments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.deliveryAssignments.status} IN ('Assigned', 'Dispatched')`)),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.menuItemAvailability.id})` })
                .from(schema_1.menuItemAvailability)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.is86ed, true))),
        ]);
        // 7. Supply Chain & Warehouse (Inventory Valuation, Low Stock, Expiring Batches, Waste, Transfers)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(now.getDate() + 7);
        const [[inventorySummary], [expiringBatches], [wasteSummary], [activeTransfers], [openAudits],] = await Promise.all([
            db_1.db
                .select({
                totalValuation: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.inventoryItems.currentStock} AS NUMERIC) * CAST(${schema_1.inventoryItems.costPrice} AS NUMERIC)), 0)`,
                lowStockCount: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN CAST(${schema_1.inventoryItems.currentStock} AS NUMERIC) <= CAST(${schema_1.inventoryItems.minThreshold} AS NUMERIC) AND CAST(${schema_1.inventoryItems.currentStock} AS NUMERIC) > 0 THEN 1 END)`,
                outOfStockCount: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN CAST(${schema_1.inventoryItems.currentStock} AS NUMERIC) <= 0 THEN 1 END)`,
                totalSkus: (0, drizzle_orm_1.sql) `COUNT(${schema_1.inventoryItems.id})`,
            })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.inventoryBatches.id})` })
                .from(schema_1.inventoryBatches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.status, 'ACTIVE'), (0, drizzle_orm_1.sql) `${schema_1.inventoryBatches.expiryDate} <= ${sevenDaysFromNow}`)),
            db_1.db
                .select({
                totalLoss: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.wasteLogs.totalLossCost} AS NUMERIC)), 0)`,
                incidents: (0, drizzle_orm_1.sql) `COUNT(${schema_1.wasteLogs.id})`,
            })
                .from(schema_1.wasteLogs)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wasteLogs.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.wasteLogs.loggedAt, startDate))),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.stockTransfers.id})` })
                .from(schema_1.stockTransfers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.stockTransfers.status} IN ('PENDING', 'APPROVED', 'IN_TRANSIT')`)),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.stockCounts.id})` })
                .from(schema_1.stockCounts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.stockCounts.status} IN ('IN_PROGRESS', 'PENDING_APPROVAL')`)),
        ]);
        // 8. Procure-to-Pay (PRs, POs, AP Invoices, Supplier Returns)
        const [[prStats], [poStats], [apInvoiceStats], [returnStats]] = await Promise.all([
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.purchaseRequests.id})` })
                .from(schema_1.purchaseRequests)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseRequests.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.purchaseRequests.status, 'PENDING'))),
            db_1.db
                .select({
                openCount: (0, drizzle_orm_1.sql) `COUNT(${schema_1.purchaseOrders.id})`,
                openCommitment: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.purchaseOrders.totalAmount} AS NUMERIC)), 0)`,
            })
                .from(schema_1.purchaseOrders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.purchaseOrders.status} IN ('ISSUED', 'PARTIALLY_RECEIVED')`)),
            db_1.db
                .select({
                unpaidCount: (0, drizzle_orm_1.sql) `COUNT(${schema_1.supplierInvoices.id})`,
                outstandingPayable: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.supplierInvoices.totalAmount} AS NUMERIC) - CAST(${schema_1.supplierInvoices.paidAmount} AS NUMERIC)), 0)`,
            })
                .from(schema_1.supplierInvoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.supplierInvoices.status} IN ('UNPAID', 'PARTIALLY_PAID', 'DISPUTED')`)),
            db_1.db
                .select({ count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.supplierReturns.id})` })
                .from(schema_1.supplierReturns)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierReturns.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.supplierReturns.status, 'PENDING_DISPATCH'))),
        ]);
        // 9. Treasury, M-Pesa Daraja, Cash Drawers & KRA eTIMS Fiscal Status
        const [activeCashSession] = await db_1.db
            .select({
            drawerName: schema_1.cashDrawers.name,
            openingFloat: schema_1.drawerSessions.openingFloat,
            expectedClosing: schema_1.drawerSessions.expectedClosingBalance,
        })
            .from(schema_1.drawerSessions)
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.status, 'OPEN')))
            .limit(1);
        const [[unallocatedMpesa], [fiscalStats], tenderBreakdownRaw, recentAuditRaw] = await Promise.all([
            db_1.db
                .select({
                count: (0, drizzle_orm_1.sql) `COUNT(${schema_1.mpesaC2bCallbacks.id})`,
                amount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.mpesaC2bCallbacks.transAmount} AS NUMERIC)), 0)`,
            })
                .from(schema_1.mpesaC2bCallbacks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaC2bCallbacks.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.mpesaC2bCallbacks.allocationStatus, 'UNALLOCATED'))),
            db_1.db
                .select({
                fiscalizedCount: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_1.fiscalInvoices.fiscalStatus} = 'FISCALIZED' THEN 1 END)`,
                pendingOrFailedCount: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_1.fiscalInvoices.fiscalStatus} IN ('PENDING', 'FAILED') THEN 1 END)`,
            })
                .from(schema_1.fiscalInvoices)
                .where((0, drizzle_orm_1.eq)(schema_1.fiscalInvoices.tenantId, tenantId)),
            db_1.db
                .select({
                method: schema_1.payments.paymentMethod,
                amount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.payments.amount} AS NUMERIC)), 0)`,
            })
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, startDate)))
                .groupBy(schema_1.payments.paymentMethod),
            db_1.db
                .select({
                id: schema_1.auditLogs.id,
                action: schema_1.auditLogs.action,
                module: schema_1.auditLogs.module,
                entityType: schema_1.auditLogs.entityType,
                createdAt: schema_1.auditLogs.createdAt,
            })
                .from(schema_1.auditLogs)
                .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.createdAt))
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
    }
    catch (error) {
        console.error('[Dashboard Analytics Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Analytics query failed' });
    }
};
exports.getDashboardAnalytics = getDashboardAnalytics;
