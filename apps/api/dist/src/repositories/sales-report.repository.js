"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesTrendTimeline = exports.getTopSellingItems = exports.getBranchSalesBreakdown = exports.getCategorySalesBreakdown = exports.getPaymentTenderBreakdown = exports.getSalesSummaryMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const parseDateRange = (startDateStr, endDateStr) => {
    let start;
    if (startDateStr) {
        start = new Date(startDateStr);
        if (!startDateStr.includes('T')) {
            start.setHours(0, 0, 0, 0);
        }
    }
    else {
        start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        start.setHours(0, 0, 0, 0);
    }
    let end;
    if (endDateStr) {
        end = new Date(endDateStr);
        if (!endDateStr.includes('T')) {
            end.setHours(23, 59, 59, 999);
        }
    }
    else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};
const getSalesSummaryMetrics = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start),
        (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined,
        query.cashierId ? (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, query.cashierId) : undefined,
    ].filter(Boolean);
    const [metrics] = await db_1.db
        .select({
        totalOrders: (0, drizzle_orm_1.sql) `count(*)`,
        completedOrders: (0, drizzle_orm_1.sql) `count(case when lower(${schema_1.orders.status}) in ('completed', 'confirmed', 'served', 'ready') or ${schema_1.orders.paymentStatus} = 'Paid' then 1 end)`,
        voidedOrders: (0, drizzle_orm_1.sql) `count(case when lower(${schema_1.orders.status}) in ('voided', 'cancelled') then 1 end)`,
        grossSales: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then ${schema_1.orders.subtotal} else 0 end), 0)::numeric`,
        netSales: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then (${schema_1.orders.subtotal} - coalesce(${schema_1.orders.discountTotal}, 0)) else 0 end), 0)::numeric`,
        discountTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then coalesce(${schema_1.orders.discountTotal}, 0) else 0 end), 0)::numeric`,
        taxTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then (coalesce(${schema_1.orders.tax}, 0) + coalesce(${schema_1.orders.cateringLevy}, 0)) else 0 end), 0)::numeric`,
        serviceChargeTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then coalesce(${schema_1.orders.serviceCharge}, 0) else 0 end), 0)::numeric`,
        deliveryFeeTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then coalesce(${schema_1.orders.deliveryFee}, 0) else 0 end), 0)::numeric`,
        grandTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then ${schema_1.orders.total} else 0 end), 0)::numeric`,
        averageOrderValue: (0, drizzle_orm_1.sql) `coalesce(avg(case when lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then ${schema_1.orders.total} else null end), 0)::numeric`,
        distinctTablesUsed: (0, drizzle_orm_1.sql) `count(distinct case when ${schema_1.orders.tableId} is not null and lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then ${schema_1.orders.tableId} end)`,
        tableSalesTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.orders.tableId} is not null and lower(${schema_1.orders.status}) not in ('voided', 'cancelled', 'draft') then ${schema_1.orders.total} else 0 end), 0)::numeric`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)(...conditions));
    const distinctTables = Number(metrics?.distinctTablesUsed || 0);
    const tableSales = Number(metrics?.tableSalesTotal || 0);
    const avgSalesByTable = distinctTables > 0 ? Math.round((tableSales / distinctTables) * 100) / 100 : 0;
    return {
        totalOrders: Number(metrics?.totalOrders || 0),
        completedOrders: Number(metrics?.completedOrders || 0),
        voidedOrders: Number(metrics?.voidedOrders || 0),
        grossSales: Number(metrics?.grossSales || 0),
        netSales: Number(metrics?.netSales || 0),
        discountTotal: Number(metrics?.discountTotal || 0),
        taxTotal: Number(metrics?.taxTotal || 0),
        serviceChargeTotal: Number(metrics?.serviceChargeTotal || 0),
        tipTotal: 0,
        grandTotal: Number(metrics?.grandTotal || 0),
        averageOrderValue: Math.round(Number(metrics?.averageOrderValue || 0) * 100) / 100,
        avgSalesByTable,
        distinctTablesCount: distinctTables,
    };
};
exports.getSalesSummaryMetrics = getSalesSummaryMetrics;
const getPaymentTenderBreakdown = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, start),
        (0, drizzle_orm_1.lte)(schema_1.payments.createdAt, end),
        (0, drizzle_orm_1.sql) `upper(${schema_1.payments.status}) in ('POSTED', 'RECONCILED', 'SUCCESS')`,
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.payments.branchId, query.branchId) : undefined,
    ].filter(Boolean);
    const breakdown = await db_1.db
        .select({
        paymentMethod: schema_1.payments.paymentMethod,
        transactionCount: (0, drizzle_orm_1.sql) `count(*)`,
        totalCollected: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.payments.amount}), 0)::numeric`,
    })
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.and)(...conditions))
        .groupBy(schema_1.payments.paymentMethod)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.payments.amount})`));
    if (breakdown.length > 0) {
        return breakdown.map((b) => ({
            paymentMethod: b.paymentMethod,
            transactionCount: Number(b.transactionCount),
            totalCollected: Number(b.totalCollected),
        }));
    }
    const orderTenders = await db_1.db
        .select({
        paymentMethod: schema_1.orders.orderType,
        transactionCount: (0, drizzle_orm_1.sql) `count(*)`,
        totalCollected: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}), 0)::numeric`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end), (0, drizzle_orm_1.sql) `lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft')`, query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined))
        .groupBy(schema_1.orders.orderType)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orders.total})`));
    return orderTenders.map((b) => ({
        paymentMethod: b.paymentMethod || 'Direct Sales',
        transactionCount: Number(b.transactionCount),
        totalCollected: Number(b.totalCollected),
    }));
};
exports.getPaymentTenderBreakdown = getPaymentTenderBreakdown;
const getCategorySalesBreakdown = async (tenantId, query, limit = 8) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const categories = await db_1.db
        .select({
        categoryId: schema_1.menuCategories.id,
        categoryName: (0, drizzle_orm_1.sql) `coalesce(${schema_1.menuCategories.name}, 'Uncategorized')`,
        totalQuantity: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}), 0)::numeric`,
        totalRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.totalPrice}), 0)::numeric`,
    })
        .from(schema_1.orderItems)
        .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end), (0, drizzle_orm_1.sql) `lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft')`, query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined))
        .groupBy(schema_1.menuCategories.id, schema_1.menuCategories.name)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.totalPrice})`))
        .limit(limit);
    return categories.map((c) => ({
        categoryId: c.categoryId ?? 0,
        categoryName: c.categoryName,
        totalQuantity: Number(c.totalQuantity),
        totalRevenue: Number(c.totalRevenue),
    }));
};
exports.getCategorySalesBreakdown = getCategorySalesBreakdown;
const getBranchSalesBreakdown = async (tenantId, query, limit = 6) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const branchSales = await db_1.db
        .select({
        branchId: schema_1.branches.id,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        orderCount: (0, drizzle_orm_1.sql) `count(${schema_1.orders.id})`,
        totalRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orders.total}), 0)::numeric`,
    })
        .from(schema_1.orders)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end), (0, drizzle_orm_1.sql) `lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft')`))
        .groupBy(schema_1.branches.id, schema_1.branches.name, schema_1.branches.code)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orders.total})`))
        .limit(limit);
    return branchSales.map((b) => ({
        branchId: b.branchId,
        branchName: b.branchName,
        branchCode: b.branchCode,
        orderCount: Number(b.orderCount),
        totalRevenue: Number(b.totalRevenue),
    }));
};
exports.getBranchSalesBreakdown = getBranchSalesBreakdown;
const getTopSellingItems = async (tenantId, query, limit = 10) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const items = await db_1.db
        .select({
        itemId: schema_1.orderItems.menuItemId,
        itemName: (0, drizzle_orm_1.sql) `coalesce(${schema_1.menuItems.name}, 'Menu Item #' || ${schema_1.orderItems.menuItemId})`,
        totalQuantitySold: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}), 0)::numeric`,
        totalRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.totalPrice}), 0)::numeric`,
    })
        .from(schema_1.orderItems)
        .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end), (0, drizzle_orm_1.sql) `lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft')`, query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined))
        .groupBy(schema_1.orderItems.menuItemId, schema_1.menuItems.name)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.orderItems.totalPrice})`))
        .limit(limit);
    return items.map((i) => ({
        itemId: i.itemId,
        itemName: i.itemName,
        totalQuantitySold: Number(i.totalQuantitySold),
        totalRevenue: Number(i.totalRevenue),
    }));
};
exports.getTopSellingItems = getTopSellingItems;
const getSalesTrendTimeline = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const timeBucketSql = query.interval === 'HOUR'
        ? (0, drizzle_orm_1.sql) `to_char(${schema_1.orders.createdAt}, 'YYYY-MM-DD HH24:00')`
        : (0, drizzle_orm_1.sql) `to_char(${schema_1.orders.createdAt}, 'YYYY-MM-DD')`;
    const timeline = await db_1.db
        .select({
        timeBucket: timeBucketSql,
        orderCount: (0, drizzle_orm_1.sql) `count(*)`,
        netSales: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft') then (${schema_1.orders.subtotal} - coalesce(${schema_1.orders.discountTotal}, 0)) else 0 end), 0)::numeric`,
        taxTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft') then (coalesce(${schema_1.orders.tax}, 0) + coalesce(${schema_1.orders.cateringLevy}, 0)) else 0 end), 0)::numeric`,
        grandTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft') then ${schema_1.orders.total} else 0 end), 0)::numeric`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end), query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined))
        .groupBy(timeBucketSql)
        .orderBy((0, drizzle_orm_1.asc)(timeBucketSql));
    return timeline.map((t) => ({
        timeBucket: t.timeBucket,
        orderCount: Number(t.orderCount),
        netSales: Number(t.netSales),
        taxTotal: Number(t.taxTotal),
        grandTotal: Number(t.grandTotal),
    }));
};
exports.getSalesTrendTimeline = getSalesTrendTimeline;
