"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStockTransaction = exports.createInventoryItemRecord = exports.getSuppliersByTenant = exports.getStorageLocationsByTenant = exports.getInventorySummaryByTenant = exports.getItemsByTenant = void 0;
// apps/api/src/repositories/inventory.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getItemsByTenant = async (tenantId) => {
    const rows = await db_1.db
        .select({
        item: schema_1.inventoryItems,
        preferredSupplierName: schema_1.suppliers.name,
    })
        .from(schema_1.inventoryItems)
        .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.preferredSupplierId, schema_1.suppliers.id), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)))
        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.inventoryItems.name));
    return rows.map(({ item, preferredSupplierName }) => ({
        ...item,
        preferredSupplierName: preferredSupplierName ?? null,
    }));
};
exports.getItemsByTenant = getItemsByTenant;
const getInventorySummaryByTenant = async (tenantId) => {
    const [summary] = await db_1.db
        .select({
        totalItems: (0, drizzle_orm_1.sql) `count(*)::int`,
        activeItems: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true)::int`,
        outOfStockCount: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true and ${schema_1.inventoryItems.currentStock} <= 0)::int`,
        lowStockCount: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true and ${schema_1.inventoryItems.currentStock} > 0 and ${schema_1.inventoryItems.currentStock} <= ${schema_1.inventoryItems.minThreshold})::int`,
        totalBookValuation: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice}), 0)::numeric(14,2)`,
    })
        .from(schema_1.inventoryItems)
        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId));
    return {
        totalItems: summary?.totalItems ?? 0,
        activeItems: summary?.activeItems ?? 0,
        lowStockCount: summary?.lowStockCount ?? 0,
        outOfStockCount: summary?.outOfStockCount ?? 0,
        totalBookValuation: summary?.totalBookValuation ?? '0.00',
    };
};
exports.getInventorySummaryByTenant = getInventorySummaryByTenant;
const getStorageLocationsByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.warehouseLocations.id,
        branchId: schema_1.warehouseLocations.branchId,
        code: schema_1.warehouseLocations.code,
        name: schema_1.warehouseLocations.name,
        zoneType: schema_1.warehouseLocations.zoneType,
        isRefrigerated: schema_1.warehouseLocations.isRefrigerated,
    })
        .from(schema_1.warehouseLocations)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.warehouseLocations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.warehouseLocations.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.warehouseLocations.code));
};
exports.getStorageLocationsByTenant = getStorageLocationsByTenant;
const getSuppliersByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.suppliers.id,
        name: schema_1.suppliers.name,
    })
        .from(schema_1.suppliers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.suppliers.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.suppliers.name));
};
exports.getSuppliersByTenant = getSuppliersByTenant;
const createInventoryItemRecord = async (tenantId, data) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Validate tenant-scoped supplier FK if provided
        if (data.preferredSupplierId !== null) {
            const [supplier] = await tx
                .select({ id: schema_1.suppliers.id })
                .from(schema_1.suppliers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.id, data.preferredSupplierId), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)));
            if (!supplier) {
                throw new Error('Selected supplier does not belong to this tenant');
            }
        }
        // 2. Enforce tenant-scoped SKU & Barcode uniqueness if provided
        if (data.sku) {
            const [existingSku] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.sku, data.sku)));
            if (existingSku) {
                throw new Error(`SKU "${data.sku}" is already assigned to another inventory article`);
            }
        }
        if (data.barcode) {
            const [existingBarcode] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.barcode, data.barcode)));
            if (existingBarcode) {
                throw new Error(`Barcode "${data.barcode}" is already assigned to another inventory article`);
            }
        }
        const openingQty = data.openingStock > 0 ? data.openingStock : 0;
        // 3. Create master record (starting at 0.0000; opening stock posted via ledger below)
        const [newItem] = await tx
            .insert(schema_1.inventoryItems)
            .values({
            tenantId,
            branchId: data.branchId,
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            materialType: data.materialType,
            category: data.category,
            unit: data.unit,
            purchaseUnit: data.purchaseUnit,
            conversionFactor: data.conversionFactor,
            preferredSupplierId: data.preferredSupplierId,
            currentStock: openingQty.toFixed(4),
            minThreshold: data.minThreshold,
            reorderQuantity: data.reorderQuantity,
            costPrice: data.costPrice,
            valuationMethod: data.valuationMethod,
            storageCondition: data.storageCondition,
            taxClassification: data.taxClassification,
            allowNegativeStock: data.allowNegativeStock,
            isActive: data.isActive,
        })
            .returning();
        // 4. Record auditable opening balance movement if initial stock > 0
        if (openingQty > 0) {
            const unitCostNum = parseFloat(data.costPrice) || 0;
            await tx.insert(schema_1.stockMovements).values({
                tenantId,
                branchId: data.branchId,
                inventoryItemId: newItem.id,
                userId: data.userId,
                type: 'PHYSICAL_INVENTORY_ADJ',
                quantity: openingQty.toFixed(4),
                unitCost: unitCostNum.toFixed(4),
                totalValuation: (openingQty * unitCostNum).toFixed(4),
                balanceAfter: openingQty.toFixed(4),
                notes: 'Initial opening stock balance on article registration',
            });
        }
        return newItem;
    });
};
exports.createInventoryItemRecord = createInventoryItemRecord;
const adjustStockTransaction = async (tenantId, data) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Lock row with FOR UPDATE to prevent concurrent lost-update race conditions
        const lockedRows = await tx
            .select()
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, data.itemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .for('update');
        const item = lockedRows[0];
        if (!item) {
            throw new Error('Inventory item not found or access denied');
        }
        // 2. Validate relational storage location belongs to the authenticated tenant
        let resolvedLocationBin = data.locationBin;
        let resolvedBranchId = data.branchId ?? item.branchId ?? null;
        if (data.locationId !== null) {
            const [location] = await tx
                .select()
                .from(schema_1.warehouseLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.warehouseLocations.id, data.locationId), (0, drizzle_orm_1.eq)(schema_1.warehouseLocations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.warehouseLocations.isActive, true)));
            if (!location) {
                throw new Error('Selected storage location is invalid or belongs to another tenant');
            }
            resolvedLocationBin = `${location.name} (${location.code})`;
            resolvedBranchId = location.branchId;
        }
        const currentStockNum = parseFloat(item.currentStock) || 0;
        const newStock = currentStockNum + data.adjustment;
        if (newStock < 0 && !item.allowNegativeStock) {
            throw new Error(`Insufficient stock: current balance is ${currentStockNum.toFixed(2)} ${item.unit}`);
        }
        // 3. Use authoritative master unit cost from backend ledger rather than trusting browser cost
        const authoritativeUnitCost = parseFloat(item.costPrice) || 0;
        const totalValuationNum = Math.abs(data.adjustment) * authoritativeUnitCost;
        const [updatedItem] = await tx
            .update(schema_1.inventoryItems)
            .set({
            currentStock: newStock.toFixed(4),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, data.itemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .returning();
        const [movement] = await tx
            .insert(schema_1.stockMovements)
            .values({
            tenantId,
            branchId: resolvedBranchId,
            inventoryItemId: data.itemId,
            userId: data.userId,
            type: data.type,
            quantity: data.adjustment.toFixed(4),
            unitCost: authoritativeUnitCost.toFixed(4),
            totalValuation: totalValuationNum.toFixed(4),
            balanceAfter: newStock.toFixed(4),
            batchNumber: data.batchNumber,
            locationBin: resolvedLocationBin,
            documentReference: data.documentReference,
            notes: data.notes,
        })
            .returning();
        return { item: updatedItem, movement };
    });
};
exports.adjustStockTransaction = adjustStockTransaction;
