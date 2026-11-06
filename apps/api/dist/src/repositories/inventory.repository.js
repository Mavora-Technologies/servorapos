"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStockTransaction = exports.createInventoryItemRecord = exports.getItemsByTenant = void 0;
// apps/api/src/repositories/inventory.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getItemsByTenant = async (tenantId) => {
    return await db_1.db.select().from(schema_1.inventoryItems).where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId));
};
exports.getItemsByTenant = getItemsByTenant;
const createInventoryItemRecord = async (tenantId, data) => {
    const [newItem] = await db_1.db.insert(schema_1.inventoryItems).values({
        tenantId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        unit: data.unit,
        currentStock: data.currentStock,
        minThreshold: data.minThreshold,
        costPrice: data.costPrice,
    }).returning();
    return newItem;
};
exports.createInventoryItemRecord = createInventoryItemRecord;
const adjustStockTransaction = async (tenantId, data) => {
    return await db_1.db.transaction(async (tx) => {
        const [item] = await tx.select().from(schema_1.inventoryItems).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, data.itemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
        if (!item)
            throw new Error('Inventory item not found or unauthorized');
        const currentStockNum = parseFloat(item.currentStock) || 0;
        const newStock = currentStockNum + data.adjustment;
        if (newStock < 0)
            throw new Error('Stock balance cannot fall below zero');
        const unitCostNum = parseFloat(item.costPrice) || 0;
        const totalValuationNum = Math.abs(data.adjustment) * unitCostNum;
        // Update current stock balance
        const [updatedItem] = await tx.update(schema_1.inventoryItems)
            .set({ currentStock: newStock.toFixed(4), updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, data.itemId))
            .returning();
        // Create traceable stock movement record with all required columns
        await tx.insert(schema_1.stockMovements).values({
            tenantId,
            inventoryItemId: data.itemId,
            type: data.type,
            quantity: data.adjustment.toFixed(4),
            unitCost: unitCostNum.toFixed(4),
            totalValuation: totalValuationNum.toFixed(4),
            balanceAfter: newStock.toFixed(4),
            notes: data.notes || null,
        });
        return updatedItem;
    });
};
exports.adjustStockTransaction = adjustStockTransaction;
