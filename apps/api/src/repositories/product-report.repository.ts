import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  menuCategories,
  branches,
} from '../config/schema';
import { ProductReportQuery } from '../validators/product-report.validator';

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

export const getProductReportMetrics = async (tenantId: number, query: ProductReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const orderConditions = [
    eq(orders.tenantId, tenantId),
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
    query.branchId ? eq(orders.branchId, query.branchId) : undefined,
  ].filter(Boolean);

  // 1. Line Item Aggregations
  const itemConditions = [
    eq(orders.tenantId, tenantId),
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
    sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
    query.branchId ? eq(orders.branchId, query.branchId) : undefined,
    query.categoryId ? eq(menuItems.categoryId, query.categoryId) : undefined,
    query.stockTrackingType && query.stockTrackingType !== 'ALL'
      ? eq(menuItems.stockTrackingType, query.stockTrackingType)
      : undefined,
    query.search ? or(ilike(menuItems.name, `%${query.search}%`), ilike(menuItems.sku, `%${query.search}%`)) : undefined,
  ].filter(Boolean);

  const productAggregates = await db
    .select({
      menuItemId: orderItems.menuItemId,
      itemName: sql<string>`coalesce(${menuItems.name}, 'Item #' || ${orderItems.menuItemId})`,
      sku: menuItems.sku,
      categoryName: sql<string>`coalesce(${menuCategories.name}, 'Unassigned')`,
      stockTrackingType: menuItems.stockTrackingType,
      kitchenStation: menuItems.kitchenStation,
      currentPrice: menuItems.price,
      quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::numeric`,
      grossRevenue: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)::numeric`,
      totalCost: sql<number>`coalesce(sum(${orderItems.quantity} * coalesce(${orderItems.unitCostSnapshot}, ${menuItems.costEstimate}, 0)), 0)::numeric`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(and(...itemConditions))
    .groupBy(
      orderItems.menuItemId,
      menuItems.name,
      menuItems.sku,
      menuCategories.name,
      menuItems.stockTrackingType,
      menuItems.kitchenStation,
      menuItems.price
    );

  // 2. Computed Financials & Portfolio Ratios
  let portfolioGrossSales = 0;
  let portfolioTotalCost = 0;
  let totalUnitsSold = 0;

  const analyzedItems = productAggregates.map((item) => {
    const qty = Number(item.quantitySold);
    const revenue = Number(item.grossRevenue);
    const cost = Number(item.totalCost);
    const grossProfit = revenue - cost;
    const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const foodCostPercent = revenue > 0 ? (cost / revenue) * 100 : 0;
    const avgPrice = qty > 0 ? revenue / qty : Number(item.currentPrice);

    portfolioGrossSales += revenue;
    portfolioTotalCost += cost;
    totalUnitsSold += qty;

    return {
      menuItemId: item.menuItemId,
      itemName: item.itemName,
      sku: item.sku || 'N/A',
      categoryName: item.categoryName,
      stockTrackingType: item.stockTrackingType || 'NON_TRACKED',
      kitchenStation: item.kitchenStation || 'MAIN_KITCHEN',
      avgSellingPrice: Math.round(avgPrice * 100) / 100,
      quantitySold: qty,
      grossRevenue: revenue,
      totalCost: cost,
      grossProfit: Math.round(grossProfit * 100) / 100,
      marginPercent: Math.round(marginPercent * 10) / 10,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
    };
  });

  // Calculate Median Volume and Margin for Menu Engineering Matrix (BCG Classification)
  const medianQty = analyzedItems.length > 0
    ? analyzedItems.map((i) => i.quantitySold).sort((a, b) => a - b)[Math.floor(analyzedItems.length / 2)]
    : 0;
  const avgMargin = portfolioGrossSales > 0
    ? ((portfolioGrossSales - portfolioTotalCost) / portfolioGrossSales) * 100
    : 50;

  const enrichedItems = analyzedItems.map((item) => {
    const isHighVolume = item.quantitySold >= medianQty;
    const isHighMargin = item.marginPercent >= avgMargin;

    let matrixClassification: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
    if (isHighVolume && isHighMargin) matrixClassification = 'STAR';
    else if (isHighVolume && !isHighMargin) matrixClassification = 'PLOWHORSE';
    else if (!isHighVolume && isHighMargin) matrixClassification = 'PUZZLE';
    else matrixClassification = 'DOG';

    return {
      ...item,
      matrixClassification,
    };
  });

  // Sort Dynamic List
  enrichedItems.sort((a, b) => {
    let diff = 0;
    if (query.sortBy === 'REVENUE') diff = b.grossRevenue - a.grossRevenue;
    else if (query.sortBy === 'QUANTITY') diff = b.quantitySold - a.quantitySold;
    else if (query.sortBy === 'PROFIT') diff = b.grossProfit - a.grossProfit;
    else if (query.sortBy === 'MARGIN') diff = b.marginPercent - a.marginPercent;
    return query.sortOrder === 'ASC' ? -diff : diff;
  });

  const totalAnalyzed = enrichedItems.length;
  const page = query.page || 1;
  const limit = query.limit || 25;
  const paginatedItems = enrichedItems.slice((page - 1) * limit, page * limit);

  // 3. Category Contribution
  const categoryMap = new Map<string, { categoryName: string; revenue: number; cost: number; units: number }>();
  enrichedItems.forEach((i) => {
    const existing = categoryMap.get(i.categoryName) || {
      categoryName: i.categoryName,
      revenue: 0,
      cost: 0,
      units: 0,
    };
    existing.revenue += i.grossRevenue;
    existing.cost += i.totalCost;
    existing.units += i.quantitySold;
    categoryMap.set(i.categoryName, existing);
  });

  const categoryBreakdown = Array.from(categoryMap.values()).map((c) => ({
    categoryName: c.categoryName,
    unitsSold: c.units,
    grossRevenue: Math.round(c.revenue * 100) / 100,
    grossProfit: Math.round((c.revenue - c.cost) * 100) / 100,
    marginPercent: c.revenue > 0 ? Math.round(((c.revenue - c.cost) / c.revenue) * 1000) / 10 : 0,
  })).sort((a, b) => b.grossRevenue - a.grossRevenue);

  const portfolioGrossProfit = portfolioGrossSales - portfolioTotalCost;
  const portfolioFoodCostPercent = portfolioGrossSales > 0 ? (portfolioTotalCost / portfolioGrossSales) * 100 : 0;

  return {
    summary: {
      totalProductsAnalyzed: totalAnalyzed,
      totalUnitsSold,
      portfolioGrossSales: Math.round(portfolioGrossSales * 100) / 100,
      portfolioTotalCost: Math.round(portfolioTotalCost * 100) / 100,
      portfolioGrossProfit: Math.round(portfolioGrossProfit * 100) / 100,
      portfolioFoodCostPercent: Math.round(portfolioFoodCostPercent * 10) / 10,
      topVolumeProduct: enrichedItems.reduce((max, i) => (i.quantitySold > (max?.quantitySold || 0) ? i : max), enrichedItems[0])?.itemName || 'None',
      topMarginProduct: enrichedItems.reduce((max, i) => (i.grossProfit > (max?.grossProfit || 0) ? i : max), enrichedItems[0])?.itemName || 'None',
    },
    items: paginatedItems,
    categoryBreakdown,
    matrixDistribution: {
      stars: enrichedItems.filter((i) => i.matrixClassification === 'STAR').length,
      plowhorses: enrichedItems.filter((i) => i.matrixClassification === 'PLOWHORSE').length,
      puzzles: enrichedItems.filter((i) => i.matrixClassification === 'PUZZLE').length,
      dogs: enrichedItems.filter((i) => i.matrixClassification === 'DOG').length,
    },
    pagination: {
      page,
      limit,
      total: totalAnalyzed,
      totalPages: Math.ceil(totalAnalyzed / limit) || 1,
    },
  };
};

export const getExportableProductReport = async (tenantId: number, query: ProductReportQuery) => {
  const result = await getProductReportMetrics(tenantId, { ...query, limit: 1000, page: 1 });
  return result;
};