"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportableInventoryReport = exports.getInventoryReportMetrics = void 0;
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
const getInventoryReportMetrics = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const itemConditions = [
        (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.inventoryItems.branchId, query.branchId) : undefined,
        query.category && query.category !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.inventoryItems.category, query.category) : undefined,
        query.materialType && query.materialType !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.inventoryItems.materialType, query.materialType) : undefined,
        query.storageCondition && query.storageCondition !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.inventoryItems.storageCondition, query.storageCondition) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.inventoryItems.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.inventoryItems.sku, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.inventoryItems.barcode, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    // 1. Executive Stock Valuation Metrics
    const [valuationSummary] = await db_1.db
        .select({
        totalSkus: (0, drizzle_orm_1.sql) `count(*)`,
        totalBookValuation: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice}), 0)::numeric`,
        outOfStockCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.inventoryItems.currentStock} <= 0 then 1 end)`,
        lowStockCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.inventoryItems.currentStock} > 0 and ${schema_1.inventoryItems.currentStock} <= ${schema_1.inventoryItems.minThreshold} then 1 end)`,
        healthyStockCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.inventoryItems.currentStock} > ${schema_1.inventoryItems.minThreshold} then 1 end)`,
    })
        .from(schema_1.inventoryItems)
        .where((0, drizzle_orm_1.and)(...itemConditions));
    // 2. Wastage & Spoilage Total in Timeframe
    const [wasteSummary] = await db_1.db
        .select({
        totalWasteCost: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.wasteLogs.totalLossCost}), 0)::numeric`,
        wasteIncidentCount: (0, drizzle_orm_1.sql) `count(*)`,
    })
        .from(schema_1.wasteLogs)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wasteLogs.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.wasteLogs.loggedAt, start), (0, drizzle_orm_1.lte)(schema_1.wasteLogs.loggedAt, end), query.branchId ? (0, drizzle_orm_1.eq)(schema_1.wasteLogs.branchId, query.branchId) : undefined));
    // 3. Category Valuation & Stock Share
    const categoryBreakdown = await db_1.db
        .select({
        category: schema_1.inventoryItems.category,
        itemCount: (0, drizzle_orm_1.sql) `count(*)`,
        totalStockQty: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.currentStock}), 0)::numeric`,
        totalValuation: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice}), 0)::numeric`,
    })
        .from(schema_1.inventoryItems)
        .where((0, drizzle_orm_1.and)(...itemConditions))
        .groupBy(schema_1.inventoryItems.category)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice})`));
    // 4. Waste Breakdown by Department
    const departmentalWaste = await db_1.db
        .select({
        department: schema_1.wasteLogs.department,
        totalLossCost: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.wasteLogs.totalLossCost}), 0)::numeric`,
        incidentCount: (0, drizzle_orm_1.sql) `count(*)`,
    })
        .from(schema_1.wasteLogs)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wasteLogs.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.wasteLogs.loggedAt, start), (0, drizzle_orm_1.lte)(schema_1.wasteLogs.loggedAt, end), query.branchId ? (0, drizzle_orm_1.eq)(schema_1.wasteLogs.branchId, query.branchId) : undefined))
        .groupBy(schema_1.wasteLogs.department)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.wasteLogs.totalLossCost})`));
    // 5. Expiring Batches Risk (Upcoming 30 days)
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const expiringBatches = await db_1.db
        .select({
        batchId: schema_1.inventoryBatches.id,
        batchNumber: schema_1.inventoryBatches.batchNumber,
        itemName: schema_1.inventoryItems.name,
        currentQuantity: schema_1.inventoryBatches.currentQuantity,
        unitCost: schema_1.inventoryBatches.unitCost,
        expiryDate: schema_1.inventoryBatches.expiryDate,
        daysRemaining: (0, drizzle_orm_1.sql) `extract(day from (${schema_1.inventoryBatches.expiryDate} - now()))::int`,
        atRiskValuation: (0, drizzle_orm_1.sql) `(${schema_1.inventoryBatches.currentQuantity} * ${schema_1.inventoryBatches.unitCost})::numeric`,
        status: schema_1.inventoryBatches.status,
    })
        .from(schema_1.inventoryBatches)
        .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.inventoryItemId, schema_1.inventoryItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.status, 'ACTIVE'), (0, drizzle_orm_1.sql) `${schema_1.inventoryBatches.currentQuantity} > 0`, (0, drizzle_orm_1.lte)(schema_1.inventoryBatches.expiryDate, thirtyDaysOut), query.branchId ? (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.branchId, query.branchId) : undefined))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.inventoryBatches.expiryDate))
        .limit(10);
    // 6. Paginated Inventory Position Matrix
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    // Sorting switch
    let orderByClause = (0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice}`);
    if (query.sortBy === 'STOCK_LEVEL') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.inventoryItems.currentStock) : (0, drizzle_orm_1.desc)(schema_1.inventoryItems.currentStock);
    }
    else if (query.sortBy === 'NAME') {
        orderByClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.inventoryItems.name) : (0, drizzle_orm_1.desc)(schema_1.inventoryItems.name);
    }
    const [countResult, stockItems] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)(...itemConditions)),
        db_1.db
            .select({
            id: schema_1.inventoryItems.id,
            name: schema_1.inventoryItems.name,
            sku: schema_1.inventoryItems.sku,
            barcode: schema_1.inventoryItems.barcode,
            category: schema_1.inventoryItems.category,
            materialType: schema_1.inventoryItems.materialType,
            unit: schema_1.inventoryItems.unit,
            costPrice: schema_1.inventoryItems.costPrice,
            minThreshold: schema_1.inventoryItems.minThreshold,
            reorderQuantity: schema_1.inventoryItems.reorderQuantity,
            currentStock: schema_1.inventoryItems.currentStock,
            valuationMethod: schema_1.inventoryItems.valuationMethod,
            storageCondition: schema_1.inventoryItems.storageCondition,
            allowNegativeStock: schema_1.inventoryItems.allowNegativeStock,
            totalValuation: (0, drizzle_orm_1.sql) `(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice})::numeric`,
            supplierName: schema_1.suppliers.name,
            branchName: schema_1.branches.name,
        })
            .from(schema_1.inventoryItems)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.inventoryItems.preferredSupplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.inventoryItems.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)(...itemConditions))
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset),
    ]);
    const totalCount = Number(countResult[0]?.count || 0);
    const formattedItems = stockItems.map((item) => {
        const stock = Number(item.currentStock);
        const min = Number(item.minThreshold);
        let healthStatus = 'HEALTHY';
        if (stock <= 0)
            healthStatus = 'OUT_OF_STOCK';
        else if (stock <= min)
            healthStatus = 'LOW_STOCK';
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
exports.getInventoryReportMetrics = getInventoryReportMetrics;
const getExportableInventoryReport = async (tenantId, query) => {
    return await (0, exports.getInventoryReportMetrics)(tenantId, { ...query, limit: 2500, page: 1 });
};
exports.getExportableInventoryReport = getExportableInventoryReport;
