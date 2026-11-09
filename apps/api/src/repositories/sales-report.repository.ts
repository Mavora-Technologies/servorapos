import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  payments,
  menuItems,
  menuCategories,
  branches,
  restaurantTables,
} from '../config/schema';
import { SalesReportQuery } from '../validators/sales-report.validator';

const parseDateRange = (startDateStr?: string, endDateStr?: string) => {
  let start: Date;
  if (startDateStr) {
    start = new Date(startDateStr);
    if (!startDateStr.includes('T')) {
      start.setHours(0, 0, 0, 0);
    }
  } else {
    start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
  }

  let end: Date;
  if (endDateStr) {
    end = new Date(endDateStr);
    if (!endDateStr.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getSalesSummaryMetrics = async (tenantId: number, query: SalesReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const conditions = [
    eq(orders.tenantId, tenantId),
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    query.branchId ? eq(orders.branchId, query.branchId) : undefined,
    query.cashierId ? eq(orders.cashierId, query.cashierId) : undefined,
  ].filter(Boolean);

  const [metrics] = await db
    .select({
      totalOrders: sql<number>`count(*)`,
      completedOrders: sql<number>`count(case when lower(${orders.status}) in ('completed', 'confirmed', 'served', 'ready') or ${orders.paymentStatus} = 'Paid' then 1 end)`,
      voidedOrders: sql<number>`count(case when lower(${orders.status}) in ('voided', 'cancelled') then 1 end)`,
      grossSales: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then ${orders.subtotal} else 0 end), 0)::numeric`,
      netSales: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then (${orders.subtotal} - coalesce(${orders.discountTotal}, 0)) else 0 end), 0)::numeric`,
      discountTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then coalesce(${orders.discountTotal}, 0) else 0 end), 0)::numeric`,
      taxTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then (coalesce(${orders.tax}, 0) + coalesce(${orders.cateringLevy}, 0)) else 0 end), 0)::numeric`,
      serviceChargeTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then coalesce(${orders.serviceCharge}, 0) else 0 end), 0)::numeric`,
      deliveryFeeTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then coalesce(${orders.deliveryFee}, 0) else 0 end), 0)::numeric`,
      grandTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then ${orders.total} else 0 end), 0)::numeric`,
      averageOrderValue: sql<number>`coalesce(avg(case when lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then ${orders.total} else null end), 0)::numeric`,
      distinctTablesUsed: sql<number>`count(distinct case when ${orders.tableId} is not null and lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then ${orders.tableId} end)`,
      tableSalesTotal: sql<number>`coalesce(sum(case when ${orders.tableId} is not null and lower(${orders.status}) not in ('voided', 'cancelled', 'draft') then ${orders.total} else 0 end), 0)::numeric`,
    })
    .from(orders)
    .where(and(...conditions));

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

export const getPaymentTenderBreakdown = async (tenantId: number, query: SalesReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const conditions = [
    eq(payments.tenantId, tenantId),
    gte(payments.createdAt, start),
    lte(payments.createdAt, end),
    sql`upper(${payments.status}) in ('POSTED', 'RECONCILED', 'SUCCESS')`,
    query.branchId ? eq(payments.branchId, query.branchId) : undefined,
  ].filter(Boolean);

  const breakdown = await db
    .select({
      paymentMethod: payments.paymentMethod,
      transactionCount: sql<number>`count(*)`,
      totalCollected: sql<number>`coalesce(sum(${payments.amount}), 0)::numeric`,
    })
    .from(payments)
    .where(and(...conditions))
    .groupBy(payments.paymentMethod)
    .orderBy(desc(sql`sum(${payments.amount})`));

  if (breakdown.length > 0) {
    return breakdown.map((b) => ({
      paymentMethod: b.paymentMethod,
      transactionCount: Number(b.transactionCount),
      totalCollected: Number(b.totalCollected),
    }));
  }

  const orderTenders = await db
    .select({
      paymentMethod: orders.orderType,
      transactionCount: sql<number>`count(*)`,
      totalCollected: sql<number>`coalesce(sum(${orders.total}), 0)::numeric`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
        query.branchId ? eq(orders.branchId, query.branchId) : undefined
      )
    )
    .groupBy(orders.orderType)
    .orderBy(desc(sql`sum(${orders.total})`));

  return orderTenders.map((b) => ({
    paymentMethod: b.paymentMethod || 'Direct Sales',
    transactionCount: Number(b.transactionCount),
    totalCollected: Number(b.totalCollected),
  }));
};

export const getCategorySalesBreakdown = async (tenantId: number, query: SalesReportQuery, limit = 8) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const categories = await db
    .select({
      categoryId: menuCategories.id,
      categoryName: sql<string>`coalesce(${menuCategories.name}, 'Uncategorized')`,
      totalQuantity: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::numeric`,
      totalRevenue: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)::numeric`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
        query.branchId ? eq(orders.branchId, query.branchId) : undefined
      )
    )
    .groupBy(menuCategories.id, menuCategories.name)
    .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
    .limit(limit);

  return categories.map((c) => ({
    categoryId: c.categoryId ?? 0,
    categoryName: c.categoryName,
    totalQuantity: Number(c.totalQuantity),
    totalRevenue: Number(c.totalRevenue),
  }));
};

export const getBranchSalesBreakdown = async (tenantId: number, query: SalesReportQuery, limit = 6) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const branchSales = await db
    .select({
      branchId: branches.id,
      branchName: branches.name,
      branchCode: branches.code,
      orderCount: sql<number>`count(${orders.id})`,
      totalRevenue: sql<number>`coalesce(sum(${orders.total}), 0)::numeric`,
    })
    .from(orders)
    .innerJoin(branches, eq(orders.branchId, branches.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`
      )
    )
    .groupBy(branches.id, branches.name, branches.code)
    .orderBy(desc(sql`sum(${orders.total})`))
    .limit(limit);

  return branchSales.map((b) => ({
    branchId: b.branchId,
    branchName: b.branchName,
    branchCode: b.branchCode,
    orderCount: Number(b.orderCount),
    totalRevenue: Number(b.totalRevenue),
  }));
};

export const getTopSellingItems = async (tenantId: number, query: SalesReportQuery, limit = 10) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const items = await db
    .select({
      itemId: orderItems.menuItemId,
      itemName: sql<string>`coalesce(${menuItems.name}, 'Menu Item #' || ${orderItems.menuItemId})`,
      totalQuantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::numeric`,
      totalRevenue: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)::numeric`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
        query.branchId ? eq(orders.branchId, query.branchId) : undefined
      )
    )
    .groupBy(orderItems.menuItemId, menuItems.name)
    .orderBy(desc(sql`sum(${orderItems.totalPrice})`))
    .limit(limit);

  return items.map((i) => ({
    itemId: i.itemId,
    itemName: i.itemName,
    totalQuantitySold: Number(i.totalQuantitySold),
    totalRevenue: Number(i.totalRevenue),
  }));
};

export const getSalesTrendTimeline = async (tenantId: number, query: SalesReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const timeBucketSql = query.interval === 'HOUR'
    ? sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD HH24:00')`
    : sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`;

  const timeline = await db
    .select({
      timeBucket: timeBucketSql,
      orderCount: sql<number>`count(*)`,
      netSales: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('cancelled', 'voided', 'draft') then (${orders.subtotal} - coalesce(${orders.discountTotal}, 0)) else 0 end), 0)::numeric`,
      taxTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('cancelled', 'voided', 'draft') then (coalesce(${orders.tax}, 0) + coalesce(${orders.cateringLevy}, 0)) else 0 end), 0)::numeric`,
      grandTotal: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('cancelled', 'voided', 'draft') then ${orders.total} else 0 end), 0)::numeric`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        query.branchId ? eq(orders.branchId, query.branchId) : undefined
      )
    )
    .groupBy(timeBucketSql)
    .orderBy(asc(timeBucketSql));

  return timeline.map((t) => ({
    timeBucket: t.timeBucket,
    orderCount: Number(t.orderCount),
    netSales: Number(t.netSales),
    taxTotal: Number(t.taxTotal),
    grandTotal: Number(t.grandTotal),
  }));
};