"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteInventoryItemMaster = exports.updateInventoryItemMaster = exports.createInventoryItemMaster = exports.getInventoryItemsMaster = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const inventory_item_validator_1 = require("../validators/inventory-item.validator");
// 1. Fetch Item Master Catalog with Multi-Tab Telemetry
const getInventoryItemsMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const items = await db_1.db
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
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.inventoryItems.preferredSupplierId, schema_1.suppliers.id))
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.inventoryItems.id));
        // Summary calculation
        let totalStockValuation = 0;
        let criticalCount = 0;
        items.forEach((item) => {
            const stock = parseFloat(item.currentStock) || 0;
            const cost = parseFloat(item.costPrice) || 0;
            const min = parseFloat(item.minThreshold) || 0;
            totalStockValuation += stock * cost;
            if (stock <= min && item.isActive) {
                criticalCount++;
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalCatalogItems: items.length,
                    totalStockValuation: Number(totalStockValuation.toFixed(2)),
                    criticalItemsCount: criticalCount,
                },
                items,
            },
        });
    }
    catch (error) {
        console.error('[Get Inventory Items Master Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch inventory catalog' });
    }
};
exports.getInventoryItemsMaster = getInventoryItemsMaster;
// 2. Create Master Material Record
const createInventoryItemMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = inventory_item_validator_1.createInventoryItemMasterSchema.parse(req.body);
        const [item] = await db_1.db
            .insert(schema_1.inventoryItems)
            .values({
            tenantId,
            branchId: branchId || null,
            name: payload.name,
            sku: payload.sku || null,
            barcode: payload.barcode || null,
            materialType: payload.materialType,
            category: payload.category,
            unit: payload.unit,
            purchaseUnit: payload.purchaseUnit || payload.unit,
            conversionFactor: payload.conversionFactor.toFixed(4),
            preferredSupplierId: payload.preferredSupplierId || null,
            costPrice: payload.costPrice.toFixed(4),
            valuationMethod: payload.valuationMethod,
            minThreshold: payload.minThreshold.toFixed(4),
            reorderQuantity: payload.reorderQuantity.toFixed(4),
            currentStock: payload.currentStock.toFixed(4),
            trackingMethod: payload.trackingMethod,
            storageCondition: payload.storageCondition,
            taxClassification: payload.taxClassification,
            allowNegativeStock: payload.allowNegativeStock,
            isActive: payload.isActive,
        })
            .returning();
        res.status(201).json({ status: 'success', data: item });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.createInventoryItemMaster = createInventoryItemMaster;
// 3. Update Existing Catalog Record
const updateInventoryItemMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = inventory_item_validator_1.updateInventoryItemMasterSchema.parse(req.body);
        const updateFields = { updatedAt: new Date() };
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
        if (payload.conversionFactor !== undefined)
            updateFields.conversionFactor = payload.conversionFactor.toFixed(4);
        if (payload.preferredSupplierId !== undefined)
            updateFields.preferredSupplierId = payload.preferredSupplierId;
        if (payload.costPrice !== undefined)
            updateFields.costPrice = payload.costPrice.toFixed(4);
        if (payload.valuationMethod !== undefined)
            updateFields.valuationMethod = payload.valuationMethod;
        if (payload.minThreshold !== undefined)
            updateFields.minThreshold = payload.minThreshold.toFixed(4);
        if (payload.reorderQuantity !== undefined)
            updateFields.reorderQuantity = payload.reorderQuantity.toFixed(4);
        if (payload.trackingMethod !== undefined)
            updateFields.trackingMethod = payload.trackingMethod;
        if (payload.storageCondition !== undefined)
            updateFields.storageCondition = payload.storageCondition;
        if (payload.taxClassification !== undefined)
            updateFields.taxClassification = payload.taxClassification;
        if (payload.allowNegativeStock !== undefined)
            updateFields.allowNegativeStock = payload.allowNegativeStock;
        if (payload.isActive !== undefined)
            updateFields.isActive = payload.isActive;
        const [updated] = await db_1.db
            .update(schema_1.inventoryItems)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .returning();
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.updateInventoryItemMaster = updateInventoryItemMaster;
// 4. Delete Catalog Item
const deleteInventoryItemMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        await db_1.db
            .delete(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
        res.status(200).json({ status: 'success', message: 'Item deleted from catalog' });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.deleteInventoryItemMaster = deleteInventoryItemMaster;
