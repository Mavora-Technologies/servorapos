import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  inventoryItems,
  inventoryBatches,
  wasteLogs,
  stockMovements,
  branches,
  suppliers,
} from '../config/schema';
import { InventoryReportQuery } from '../validators/inventory-report.validator';

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

export const getInventoryReportMetrics = async (tenantId: number, query: InventoryReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const itemConditions = [
    eq(inventoryItems.tenantId, tenantId),
    eq(inventoryItems.isActive, true),
    query.branchId ? eq(inventoryItems.branchId, query.branchId) : undefined,
    query.category && query.category !== 'ALL' ? eq(inventoryItems.category, query.category) : undefined,
    query.materialType && query.materialType !== 'ALL' ? eq(inventoryItems.materialType, query.materialType) : undefined,
    query.storageCondition && query.storageCondition !== 'ALL' ? eq(inventoryItems.storageCondition, query.storageCondition) : undefined,
    query.search
      ? or(
          ilike(inventoryItems.name, `%${query.search}%`),
          ilike(inventoryItems.sku, `%${query.search}%`),
          ilike(inventoryItems.barcode, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  // 1. Executive Stock Valuation Metrics
  const [valuationSummary] = await db
    .select({
      totalSkus: sql<number>`count(*)`,
      totalBookValuation: sql<number>`coalesce(sum(${inventoryItems.currentStock} * ${inventoryItems.costPrice}), 0)::numeric`,
      outOfStockCount: sql<number>`count(case when ${inventoryItems.currentStock} <= 0 then 1 end)`,
      lowStockCount: sql<number>`count(case when ${inventoryItems.currentStock} > 0 and ${inventoryItems.currentStock} <= ${inventoryItems.minThreshold} then 1 end)`,
      healthyStockCount: sql<number>`count(case when ${inventoryItems.currentStock} > ${inventoryItems.minThreshold} then 1 end)`,
    })
    .from(inventoryItems)
    .where(and(...itemConditions));

  // 2. Wastage & Spoilage Total in Timeframe
  const [wasteSummary] = await db
    .select({
      totalWasteCost: sql<number>`coalesce(sum(${wasteLogs.totalLossCost}), 0)::numeric`,
      wasteIncidentCount: sql<number>`count(*)`,
    })
    .from(wasteLogs)
    .where(
      and(
        eq(wasteLogs.tenantId, tenantId),
        gte(wasteLogs.loggedAt, start),
        lte(wasteLogs.loggedAt, end),
        query.branchId ? eq(wasteLogs.branchId, query.branchId) : undefined
      )
    );

  // 3. Category Valuation & Stock Share
  const categoryBreakdown = await db
    .select({
      category: inventoryItems.category,
      itemCount: sql<number>`count(*)`,
      totalStockQty: sql<number>`coalesce(sum(${inventoryItems.currentStock}), 0)::numeric`,
      totalValuation: sql<number>`coalesce(sum(${inventoryItems.currentStock} * ${inventoryItems.costPrice}), 0)::numeric`,
    })
    .from(inventoryItems)
    .where(and(...itemConditions))
    .groupBy(inventoryItems.category)
    .orderBy(desc(sql`sum(${inventoryItems.currentStock} * ${inventoryItems.costPrice})`));

  // 4. Waste Breakdown by Department
  const departmentalWaste = await db
    .select({
      department: wasteLogs.department,
      totalLossCost: sql<number>`coalesce(sum(${wasteLogs.totalLossCost}), 0)::numeric`,
      incidentCount: sql<number>`count(*)`,
    })
    .from(wasteLogs)
    .where(
      and(
        eq(wasteLogs.tenantId, tenantId),
        gte(wasteLogs.loggedAt, start),
        lte(wasteLogs.loggedAt, end),
        query.branchId ? eq(wasteLogs.branchId, query.branchId) : undefined
      )
    )
    .groupBy(wasteLogs.department)
    .orderBy(desc(sql`sum(${wasteLogs.totalLossCost})`));

  // 5. Expiring Batches Risk (Upcoming 30 days)
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const expiringBatches = await db
    .select({
      batchId: inventoryBatches.id,
      batchNumber: inventoryBatches.batchNumber,
      itemName: inventoryItems.name,
      currentQuantity: inventoryBatches.currentQuantity,
      unitCost: inventoryBatches.unitCost,
      expiryDate: inventoryBatches.expiryDate,
      daysRemaining: sql<number>`extract(day from (${inventoryBatches.expiryDate} - now()))::int`,
      atRiskValuation: sql<number>`(${inventoryBatches.currentQuantity} * ${inventoryBatches.unitCost})::numeric`,
      status: inventoryBatches.status,
    })
    .from(inventoryBatches)
    .innerJoin(inventoryItems, eq(inventoryBatches.inventoryItemId, inventoryItems.id))
    .where(
      and(
        eq(inventoryBatches.tenantId, tenantId),
        eq(inventoryBatches.status, 'ACTIVE'),
        sql`${inventoryBatches.currentQuantity} > 0`,
        lte(inventoryBatches.expiryDate, thirtyDaysOut),
        query.branchId ? eq(inventoryBatches.branchId, query.branchId) : undefined
      )
    )
    .orderBy(asc(inventoryBatches.expiryDate))
    .limit(10);

  // 6. Paginated Inventory Position Matrix
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  // Sorting switch
  let orderByClause = desc(sql`${inventoryItems.currentStock} * ${inventoryItems.costPrice}`);
  if (query.sortBy === 'STOCK_LEVEL') {
    orderByClause = query.sortOrder === 'ASC' ? asc(inventoryItems.currentStock) : desc(inventoryItems.currentStock);
  } else if (query.sortBy === 'NAME') {
    orderByClause = query.sortOrder === 'ASC' ? asc(inventoryItems.name) : desc(inventoryItems.name);
  }

  const [countResult, stockItems] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryItems)
      .where(and(...itemConditions)),
    db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        sku: inventoryItems.sku,
        barcode: inventoryItems.barcode,
        category: inventoryItems.category,
        materialType: inventoryItems.materialType,
        unit: inventoryItems.unit,
        costPrice: inventoryItems.costPrice,
        minThreshold: inventoryItems.minThreshold,
        reorderQuantity: inventoryItems.reorderQuantity,
        currentStock: inventoryItems.currentStock,
        valuationMethod: inventoryItems.valuationMethod,
        storageCondition: inventoryItems.storageCondition,
        allowNegativeStock: inventoryItems.allowNegativeStock,
        totalValuation: sql<number>`(${inventoryItems.currentStock} * ${inventoryItems.costPrice})::numeric`,
        supplierName: suppliers.name,
        branchName: branches.name,
      })
      .from(inventoryItems)
      .leftJoin(suppliers, eq(inventoryItems.preferredSupplierId, suppliers.id))
      .leftJoin(branches, eq(inventoryItems.branchId, branches.id))
      .where(and(...itemConditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
  ]);

  const totalCount = Number(countResult[0]?.count || 0);

  const formattedItems = stockItems.map((item) => {
    const stock = Number(item.currentStock);
    const min = Number(item.minThreshold);
    let healthStatus: 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'HEALTHY';
    if (stock <= 0) healthStatus = 'OUT_OF_STOCK';
    else if (stock <= min) healthStatus = 'LOW_STOCK';

    return {
      ...item,
      currentStock: stock,
      costPrice: Number(item.costPrice),
      minThreshold: min,
      reorderQuantity: Number(item.reorderQuantity),
      totalValuation: Number(item.totalValuation),
      healthStatus,
    };
  });

  return {
    summary: {
      totalSkus: Number(valuationSummary?.totalSkus || 0),
      totalBookValuation: Number(valuationSummary?.totalBookValuation || 0),
      outOfStockCount: Number(valuationSummary?.outOfStockCount || 0),
      lowStockCount: Number(valuationSummary?.lowStockCount || 0),
      healthyStockCount: Number(valuationSummary?.healthyStockCount || 0),
      totalWasteCost: Number(wasteSummary?.totalWasteCost || 0),
      wasteIncidentCount: Number(wasteSummary?.wasteIncidentCount || 0),
    },
    categoryBreakdown: categoryBreakdown.map((c) => ({
      category: c.category,
      itemCount: Number(c.itemCount),
      totalStockQty: Number(c.totalStockQty),
      totalValuation: Number(c.totalValuation),
    })),
    departmentalWaste: departmentalWaste.map((w) => ({
      department: w.department,
      totalLossCost: Number(w.totalLossCost),
      incidentCount: Number(w.incidentCount),
    })),
    expiringBatches: expiringBatches.map((b) => ({
      batchId: b.batchId,
      batchNumber: b.batchNumber,
      itemName: b.itemName,
      currentQuantity: Number(b.currentQuantity),
      unitCost: Number(b.unitCost),
      expiryDate: b.expiryDate,
      daysRemaining: Number(b.daysRemaining),
      atRiskValuation: Number(b.atRiskValuation),
      status: b.status,
    })),
    items: formattedItems,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
};

export const getExportableInventoryReport = async (tenantId: number, query: InventoryReportQuery) => {
  return await getInventoryReportMetrics(tenantId, { ...query, limit: 2500, page: 1 });
};