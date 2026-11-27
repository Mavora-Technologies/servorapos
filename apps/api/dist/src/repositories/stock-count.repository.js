"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStockCountTransaction = exports.updateStockCountLineTransaction = exports.createStockCountSessionTransaction = exports.findStockCountDetailsById = exports.findStockCountsByTenant = void 0;
// apps/api/src/repositories/stock-count.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findStockCountsByTenant = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.stockCounts.id,
        countNumber: schema_1.stockCounts.countNumber,
        status: schema_1.stockCounts.status,
        countType: schema_1.stockCounts.countType,
        category: schema_1.stockCounts.category,
        isBlindCount: schema_1.stockCounts.isBlindCount,
        totalItemsCount: schema_1.stockCounts.totalItemsCount,
        discrepancyItemsCount: schema_1.stockCounts.discrepancyItemsCount,
        netVarianceCost: schema_1.stockCounts.netVarianceCost,
        conductorEmail: schema_1.users.email,
        reconciledAt: schema_1.stockCounts.reconciledAt,
        notes: schema_1.stockCounts.notes,
        createdAt: schema_1.stockCounts.createdAt,
    })
        .from(schema_1.stockCounts)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.conductorId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .where((0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.stockCounts.createdAt));
};
exports.findStockCountsByTenant = findStockCountsByTenant;
const findStockCountDetailsById = async (tenantId, countId) => {
    const [header] = await db_1.db
        .select({
        id: schema_1.stockCounts.id,
        countNumber: schema_1.stockCounts.countNumber,
        status: schema_1.stockCounts.status,
        countType: schema_1.stockCounts.countType,
        category: schema_1.stockCounts.category,
        isBlindCount: schema_1.stockCounts.isBlindCount,
        totalItemsCount: schema_1.stockCounts.totalItemsCount,
        discrepancyItemsCount: schema_1.stockCounts.discrepancyItemsCount,
        netVarianceCost: schema_1.stockCounts.netVarianceCost,
        conductorEmail: schema_1.users.email,
        reconciledAt: schema_1.stockCounts.reconciledAt,
        notes: schema_1.stockCounts.notes,
        createdAt: schema_1.stockCounts.createdAt,
    })
        .from(schema_1.stockCounts)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.conductorId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.id, countId), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
        .limit(1);
    if (!header)
        return null;
    const items = await db_1.db
        .select({
        id: schema_1.stockCountItems.id,
        inventoryItemId: schema_1.stockCountItems.inventoryItemId,
        itemName: schema_1.inventoryItems.name,
        itemSku: schema_1.inventoryItems.sku,
        itemUnit: schema_1.inventoryItems.unit,
        itemCategory: schema_1.inventoryItems.category,
        expectedQuantity: schema_1.stockCountItems.expectedQuantity,
        countedQuantity: schema_1.stockCountItems.countedQuantity,
        varianceQuantity: schema_1.stockCountItems.varianceQuantity,
        unitCost: schema_1.stockCountItems.unitCost,
        varianceCost: schema_1.stockCountItems.varianceCost,
        recountRequired: schema_1.stockCountItems.recountRequired,
        notes: schema_1.stockCountItems.notes,
    })
        .from(schema_1.stockCountItems)
        .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCountItems.inventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
        .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.stockCountId, header.id))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.inventoryItems.name));
    return { ...header, items };
};
exports.findStockCountDetailsById = findStockCountDetailsById;
const createStockCountSessionTransaction = async (tenantId, branchId, userId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const uniqueItemIds = payload.countType === 'SPOT_CHECK' && payload.inventoryItemIds
            ? Array.from(new Set(payload.inventoryItemIds))
            : [];
        const scopeConditions = payload.countType === 'CYCLE' && payload.category
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.category, payload.category))
            : payload.countType === 'SPOT_CHECK' && uniqueItemIds.length > 0
                ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, uniqueItemIds))
                : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true));
        const snapshotItems = await tx
            .select({
            id: schema_1.inventoryItems.id,
            currentStock: schema_1.inventoryItems.currentStock,
            costPrice: schema_1.inventoryItems.costPrice,
        })
            .from(schema_1.inventoryItems)
            .where(scopeConditions)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.inventoryItems.name));
        if (payload.countType === 'SPOT_CHECK' &&
            snapshotItems.length !== uniqueItemIds.length) {
            throw new Error('One or more selected products are invalid, inactive, or do not belong to this tenant.');
        }
        if (snapshotItems.length === 0) {
            throw new Error('No active inventory articles found for the selected audit scope.');
        }
        const suffix = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
        const countNumber = `PI-${new Date().getFullYear()}-${suffix}`;
        const [countHeader] = await tx
            .insert(schema_1.stockCounts)
            .values({
            tenantId,
            branchId,
            countNumber,
            status: 'IN_PROGRESS',
            countType: payload.countType,
            category: payload.countType === 'CYCLE' ? payload.category ?? null : null,
            isBlindCount: payload.isBlindCount,
            totalItemsCount: snapshotItems.length,
            discrepancyItemsCount: 0,
            netVarianceCost: '0.0000',
            conductorId: userId,
            notes: payload.notes ?? null,
        })
            .returning();
        await tx.insert(schema_1.stockCountItems).values(snapshotItems.map((it) => ({
            stockCountId: countHeader.id,
            inventoryItemId: it.id,
            expectedQuantity: it.currentStock,
            countedQuantity: null,
            varianceQuantity: null,
            unitCost: it.costPrice,
            varianceCost: null,
            recountRequired: false,
        })));
        return countHeader;
    });
};
exports.createStockCountSessionTransaction = createStockCountSessionTransaction;
const updateStockCountLineTransaction = async (tenantId, lineId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [line] = await tx
            .select({
            id: schema_1.stockCountItems.id,
            expectedQuantity: schema_1.stockCountItems.expectedQuantity,
            unitCost: schema_1.stockCountItems.unitCost,
            stockCountId: schema_1.stockCountItems.stockCountId,
            parentStatus: schema_1.stockCounts.status,
        })
            .from(schema_1.stockCountItems)
            .innerJoin(schema_1.stockCounts, (0, drizzle_orm_1.eq)(schema_1.stockCountItems.stockCountId, schema_1.stockCounts.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCountItems.id, lineId), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
            .limit(1);
        if (!line) {
            return null;
        }
        if (line.parentStatus === 'RECONCILED' || line.parentStatus === 'CANCELLED') {
            throw new Error(`Cannot modify line item: audit session is already ${line.parentStatus}.`);
        }
        const expected = parseFloat(line.expectedQuantity) || 0;
        const counted = payload.countedQuantity;
        const varianceQty = counted - expected;
        const unitCost = parseFloat(line.unitCost) || 0;
        const varianceCost = varianceQty * unitCost;
        // Tolerance rule: variance > KES 1,500 or > 15% of expected quantity
        const isLargeCostDiscrepancy = Math.abs(varianceCost) > 1500;
        const isLargePercentDiscrepancy = expected > 0 && Math.abs(varianceQty / expected) > 0.15;
        const recountRequired = isLargeCostDiscrepancy || isLargePercentDiscrepancy;
        const [updated] = await tx
            .update(schema_1.stockCountItems)
            .set({
            countedQuantity: counted.toFixed(4),
            varianceQuantity: varianceQty.toFixed(4),
            varianceCost: varianceCost.toFixed(4),
            recountRequired,
            notes: payload.notes ?? null,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.id, line.id))
            .returning();
        return updated;
    });
};
exports.updateStockCountLineTransaction = updateStockCountLineTransaction;
const reconcileStockCountTransaction = async (tenantId, branchId, userId, countId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Lock header row to prevent concurrent double reconciliation
        const lockedHeaders = await tx
            .select()
            .from(schema_1.stockCounts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.id, countId), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
            .for('update');
        const header = lockedHeaders[0];
        if (!header) {
            throw new Error('Stock count session not found.');
        }
        if (header.status === 'RECONCILED') {
            throw new Error('This audit session has already been reconciled.');
        }
        if (header.status === 'CANCELLED') {
            throw new Error('Cannot reconcile a cancelled audit session.');
        }
        const lines = await tx
            .select()
            .from(schema_1.stockCountItems)
            .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.stockCountId, header.id));
        if (lines.length === 0) {
            throw new Error('Audit session contains no line items.');
        }
        let netVarianceCost = 0;
        let discrepancyCount = 0;
        for (const line of lines) {
            if (line.countedQuantity === null) {
                throw new Error('All listed inventory items must have a physical count before reconciliation.');
            }
            const countedQty = parseFloat(line.countedQuantity) || 0;
            // 2. Lock tenant-scoped inventory item row for atomic balance reconciliation
            const lockedInvRows = await tx
                .select()
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, line.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                .for('update');
            const invItem = lockedInvRows[0];
            if (!invItem) {
                continue;
            }
            const liveStock = parseFloat(invItem.currentStock) || 0;
            const authoritativeUnitCost = parseFloat(invItem.costPrice) || 0;
            const adjustmentDelta = countedQty - liveStock;
            const lineVarianceCost = adjustmentDelta * authoritativeUnitCost;
            netVarianceCost += lineVarianceCost;
            if (Math.abs(adjustmentDelta) > 0.00001) {
                discrepancyCount++;
                // Post compensating double-entry movement matching liveStock + delta = countedQty
                await tx.insert(schema_1.stockMovements).values({
                    tenantId,
                    branchId: header.branchId ?? branchId,
                    inventoryItemId: invItem.id,
                    userId,
                    type: 'PHYSICAL_INVENTORY_ADJ',
                    quantity: adjustmentDelta.toFixed(4),
                    unitCost: authoritativeUnitCost.toFixed(4),
                    totalValuation: (Math.abs(adjustmentDelta) * authoritativeUnitCost).toFixed(4),
                    balanceAfter: countedQty.toFixed(4),
                    documentReference: header.countNumber,
                    locationBin: 'Physical Audit Reconciliation',
                    notes: `Stocktake ${header.countNumber} variance adjustment`,
                });
                await tx
                    .update(schema_1.inventoryItems)
                    .set({
                    currentStock: countedQty.toFixed(4),
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, invItem.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
                // Keep count line variance aligned with final reconciled delta
                await tx
                    .update(schema_1.stockCountItems)
                    .set({
                    varianceQuantity: adjustmentDelta.toFixed(4),
                    unitCost: authoritativeUnitCost.toFixed(4),
                    varianceCost: lineVarianceCost.toFixed(4),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.id, line.id));
            }
        }
        const [reconciled] = await tx
            .update(schema_1.stockCounts)
            .set({
            status: 'RECONCILED',
            reconciledAt: new Date(),
            approvedById: userId,
            discrepancyItemsCount: discrepancyCount,
            netVarianceCost: netVarianceCost.toFixed(4),
            notes: payload.notes ?? header.notes,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.id, header.id), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
            .returning();
        return reconciled;
    });
};
exports.reconcileStockCountTransaction = reconcileStockCountTransaction;
