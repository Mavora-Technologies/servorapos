"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMasterItemRecord = exports.updateMasterItemRecord = exports.createMasterItemTransaction = exports.getMasterCatalogSummaryByTenant = exports.findAllMasterItemsByTenant = void 0;
// apps/api/src/repositories/inventory-item.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findAllMasterItemsByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.inventoryItems.id,
        tenantId: schema_1.inventoryItems.tenantId,
        branchId: schema_1.inventoryItems.branchId,
        preferredSupplierId: schema_1.inventoryItems.preferredSupplierId,
        preferredSupplierName: schema_1.suppliers.name,
        preferredSupplierLeadTime: schema_1.suppliers.leadTimeDays,
        name: schema_1.inventoryItems.name,
        sku: schema_1.inventoryItems.sku,
        barcode: schema_1.inventoryItems.barcode,
        materialType: schema_1.inventoryItems.materialType,
        category: schema_1.inventoryItems.category,
        unit: schema_1.inventoryItems.unit,
        purchaseUnit: schema_1.inventoryItems.purchaseUnit,
        conversionFactor: schema_1.inventoryItems.conversionFactor,
        currentStock: schema_1.inventoryItems.currentStock,
        minThreshold: schema_1.inventoryItems.minThreshold,
        reorderQuantity: schema_1.inventoryItems.reorderQuantity,
        costPrice: schema_1.inventoryItems.costPrice,
        valuationMethod: schema_1.inventoryItems.valuationMethod,
        trackingMethod: schema_1.inventoryItems.trackingMethod,
        storageCondition: schema_1.inventoryItems.storageCondition,
        taxClassification: schema_1.inventoryItems.taxClassification,
        allowNegativeStock: schema_1.inventoryItems.allowNegativeStock,
        isActive: schema_1.inventoryItems.isActive,
        createdAt: schema_1.inventoryItems.createdAt,
        updatedAt: schema_1.inventoryItems.updatedAt,
    })
        .from(schema_1.inventoryItems)
        .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.preferredSupplierId, schema_1.suppliers.id), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)))
        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.inventoryItems.id));
};
exports.findAllMasterItemsByTenant = findAllMasterItemsByTenant;
const getMasterCatalogSummaryByTenant = async (tenantId) => {
    const [row] = await db_1.db
        .select({
        totalItems: (0, drizzle_orm_1.sql) `count(*)::int`,
        activeItems: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true)::int`,
        outOfStockCount: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true and ${schema_1.inventoryItems.currentStock} <= 0)::int`,
        lowStockCount: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true and ${schema_1.inventoryItems.currentStock} > 0 and ${schema_1.inventoryItems.currentStock} <= ${schema_1.inventoryItems.minThreshold})::int`,
        criticalItemsCount: (0, drizzle_orm_1.sql) `count(*) filter (where ${schema_1.inventoryItems.isActive} = true and ${schema_1.inventoryItems.currentStock} <= ${schema_1.inventoryItems.minThreshold})::int`,
        totalBookValuation: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.inventoryItems.currentStock} * ${schema_1.inventoryItems.costPrice}), 0)::numeric(14,2)`,
    })
        .from(schema_1.inventoryItems)
        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId));
    const valuationNumber = Number(row?.totalBookValuation ?? 0);
    return {
        totalCatalogItems: row?.totalItems ?? 0,
        totalItems: row?.totalItems ?? 0,
        activeItems: row?.activeItems ?? 0,
        lowStockCount: row?.lowStockCount ?? 0,
        outOfStockCount: row?.outOfStockCount ?? 0,
        criticalItemsCount: row?.criticalItemsCount ?? 0,
        totalStockValuation: valuationNumber,
        totalBookValuation: (row?.totalBookValuation ?? '0.00').toString(),
    };
};
exports.getMasterCatalogSummaryByTenant = getMasterCatalogSummaryByTenant;
const createMasterItemTransaction = async (tenantId, branchId, userId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        if (payload.preferredSupplierId !== null) {
            const [supplier] = await tx
                .select({ id: schema_1.suppliers.id })
                .from(schema_1.suppliers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.id, payload.preferredSupplierId), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)));
            if (!supplier) {
                throw new Error('Selected supplier does not exist or does not belong to this tenant');
            }
        }
        if (payload.sku) {
            const [dupSku] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.sku, payload.sku)));
            if (dupSku) {
                throw new Error(`SKU "${payload.sku}" is already assigned to another material record`);
            }
        }
        if (payload.barcode) {
            const [dupBarcode] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.barcode, payload.barcode)));
            if (dupBarcode) {
                throw new Error(`Barcode "${payload.barcode}" is already assigned to another material record`);
            }
        }
        const openingQty = payload.currentStock > 0 ? payload.currentStock : 0;
        const [created] = await tx
            .insert(schema_1.inventoryItems)
            .values({
            tenantId,
            branchId,
            name: payload.name,
            sku: payload.sku ?? null,
            barcode: payload.barcode ?? null,
            materialType: payload.materialType,
            category: payload.category,
            unit: payload.unit,
            purchaseUnit: payload.purchaseUnit ?? payload.unit,
            conversionFactor: payload.conversionFactor.toFixed(4),
            preferredSupplierId: payload.preferredSupplierId,
            costPrice: payload.costPrice.toFixed(4),
            valuationMethod: payload.valuationMethod,
            minThreshold: payload.minThreshold.toFixed(4),
            reorderQuantity: payload.reorderQuantity.toFixed(4),
            currentStock: openingQty.toFixed(4),
            trackingMethod: payload.trackingMethod,
            storageCondition: payload.storageCondition,
            taxClassification: payload.taxClassification,
            allowNegativeStock: payload.allowNegativeStock,
            isActive: payload.isActive,
        })
            .returning();
        if (openingQty > 0) {
            await tx.insert(schema_1.stockMovements).values({
                tenantId,
                branchId,
                inventoryItemId: created.id,
                userId,
                type: 'PHYSICAL_INVENTORY_ADJ',
                quantity: openingQty.toFixed(4),
                unitCost: payload.costPrice.toFixed(4),
                totalValuation: (openingQty * payload.costPrice).toFixed(4),
                balanceAfter: openingQty.toFixed(4),
                notes: 'Initial opening stock balance on material master creation',
            });
        }
        return created;
    });
};
exports.createMasterItemTransaction = createMasterItemTransaction;
const updateMasterItemRecord = async (tenantId, itemId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: schema_1.inventoryItems.id })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, itemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
        if (!existing) {
            return null;
        }
        if (payload.preferredSupplierId !== undefined && payload.preferredSupplierId !== null) {
            const [supplier] = await tx
                .select({ id: schema_1.suppliers.id })
                .from(schema_1.suppliers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.suppliers.id, payload.preferredSupplierId), (0, drizzle_orm_1.eq)(schema_1.suppliers.tenantId, tenantId)));
            if (!supplier) {
                throw new Error('Selected supplier does not exist or does not belong to this tenant');
            }
        }
        if (payload.sku) {
            const [dupSku] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.sku, payload.sku), (0, drizzle_orm_1.ne)(schema_1.inventoryItems.id, itemId)));
            if (dupSku) {
                throw new Error(`SKU "${payload.sku}" is already assigned to another material record`);
            }
        }
        if (payload.barcode) {
            const [dupBarcode] = await tx
                .select({ id: schema_1.inventoryItems.id })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.barcode, payload.barcode), (0, drizzle_orm_1.ne)(schema_1.inventoryItems.id, itemId)));
            if (dupBarcode) {
                throw new Error(`Barcode "${payload.barcode}" is already assigned to another material record`);
            }
        }
        const updateFields = {
            updatedAt: new Date(),
        };
        if (payload.name !== undefined)
            updateFields.name = payload.name;
        if (payload.sku !== undefined)
            updateFields.sku = payload.sku;
        if (payload.barcode !== undefined)
            updateFields.barcode = payload.barcode;
        if (payload.materialType !== undefined)
            updateFields.materialType = payload.materialType;
        if (payload.category !== undefined)
            updateFields.category = payload.category;
        if (payload.unit !== undefined)
            updateFields.unit = payload.unit;
        if (payload.purchaseUnit !== undefined)
            updateFields.purchaseUnit = payload.purchaseUnit;
        if (payload.conversionFactor !== undefined) {
            updateFields.conversionFactor = payload.conversionFactor.toFixed(4);
        }
        if (payload.preferredSupplierId !== undefined) {
            updateFields.preferredSupplierId = payload.preferredSupplierId;
        }
        if (payload.costPrice !== undefined)
            updateFields.costPrice = payload.costPrice.toFixed(4);
        if (payload.valuationMethod !== undefined) {
            updateFields.valuationMethod = payload.valuationMethod;
        }
        if (payload.minThreshold !== undefined) {
            updateFields.minThreshold = payload.minThreshold.toFixed(4);
        }
        if (payload.reorderQuantity !== undefined) {
            updateFields.reorderQuantity = payload.reorderQuantity.toFixed(4);
        }
        if (payload.trackingMethod !== undefined) {
            updateFields.trackingMethod = payload.trackingMethod;
        }
        if (payload.storageCondition !== undefined) {
            updateFields.storageCondition = payload.storageCondition;
        }
        if (payload.taxClassification !== undefined) {
            updateFields.taxClassification = payload.taxClassification;
        }
        if (payload.allowNegativeStock !== undefined) {
            updateFields.allowNegativeStock = payload.allowNegativeStock;
        }
        if (payload.isActive !== undefined)
            updateFields.isActive = payload.isActive;
        const [updated] = await tx
            .update(schema_1.inventoryItems)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, itemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .returning();
        return updated ?? null;
    });
};
exports.updateMasterItemRecord = updateMasterItemRecord;
const deleteMasterItemRecord = async (tenantId, itemId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.inventoryItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, itemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
        .returning({ id: schema_1.inventoryItems.id });
    return deleted ?? null;
};
exports.deleteMasterItemRecord = deleteMasterItemRecord;
