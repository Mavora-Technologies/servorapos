"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconcileStockCount = exports.updateStockCountLine = exports.initiateStockCount = exports.getStockCountDetails = exports.getStockCounts = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const stock_count_validator_1 = require("../validators/stock-count.validator");
// 1. Get Stocktake Session Registry
const getStockCounts = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const counts = await db_1.db
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
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.stockCounts.conductorId, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.stockCounts.createdAt));
        res.status(200).json({ status: 'success', data: counts });
    }
    catch (error) {
        console.error('[Get Stock Counts Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getStockCounts = getStockCounts;
// 2. Get Single Stocktake Floor Audit Sheet with Lines
const getStockCountDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
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
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.stockCounts.conductorId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
            .limit(1);
        if (!header) {
            res.status(404).json({ status: 'error', message: 'Stock count not found' });
            return;
        }
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
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.stockCountItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.stockCountId, header.id));
        res.status(200).json({ status: 'success', data: { ...header, items } });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getStockCountDetails = getStockCountDetails;
// 3. Initiate Physical Count (Snapshots Live Stock Balances)
const initiateStockCount = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_count_validator_1.initiateStockCountSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const countNum = `PI-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // Fetch snapshot candidates based on scope
            let itemsQuery = tx
                .select({
                id: schema_1.inventoryItems.id,
                currentStock: schema_1.inventoryItems.currentStock,
                costPrice: schema_1.inventoryItems.costPrice,
            })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true)));
            if (payload.countType === 'CYCLE' && payload.category) {
                itemsQuery = tx
                    .select({
                    id: schema_1.inventoryItems.id,
                    currentStock: schema_1.inventoryItems.currentStock,
                    costPrice: schema_1.inventoryItems.costPrice,
                })
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.isActive, true), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.category, payload.category)));
            }
            const snapshotItems = await itemsQuery;
            if (snapshotItems.length === 0) {
                throw new Error('No active inventory items found for this audit scope');
            }
            const [countHeader] = await tx
                .insert(schema_1.stockCounts)
                .values({
                tenantId,
                branchId,
                countNumber: countNum,
                status: 'IN_PROGRESS',
                countType: payload.countType,
                category: payload.category || null,
                isBlindCount: payload.isBlindCount,
                totalItemsCount: snapshotItems.length,
                discrepancyItemsCount: 0,
                netVarianceCost: '0.0000',
                conductorId: userId ? Number(userId) : null,
                notes: payload.notes || null,
            })
                .returning();
            const lineValues = snapshotItems.map((it) => ({
                stockCountId: countHeader.id,
                inventoryItemId: it.id,
                expectedQuantity: it.currentStock,
                countedQuantity: null,
                varianceQuantity: null,
                unitCost: it.costPrice,
                varianceCost: null,
                recountRequired: false,
            }));
            await tx.insert(schema_1.stockCountItems).values(lineValues);
            return countHeader;
        });
        res.status(201).json({ status: 'success', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.initiateStockCount = initiateStockCount;
// 4. Update Single Audit Line (Calculates Variance & Recount Flag)
const updateStockCountLine = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { itemId } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_count_validator_1.updateCountLineSchema.parse(req.body);
        const [line] = await db_1.db
            .select({
            id: schema_1.stockCountItems.id,
            expectedQuantity: schema_1.stockCountItems.expectedQuantity,
            unitCost: schema_1.stockCountItems.unitCost,
            stockCountId: schema_1.stockCountItems.stockCountId,
        })
            .from(schema_1.stockCountItems)
            .innerJoin(schema_1.stockCounts, (0, drizzle_orm_1.eq)(schema_1.stockCountItems.stockCountId, schema_1.stockCounts.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCountItems.id, Number(itemId)), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
            .limit(1);
        if (!line) {
            res.status(404).json({ status: 'error', message: 'Count line not found' });
            return;
        }
        const expected = parseFloat(line.expectedQuantity) || 0;
        const counted = payload.countedQuantity;
        const varianceQty = counted - expected;
        const unitCost = parseFloat(line.unitCost) || 0;
        const varianceCost = varianceQty * unitCost;
        // Recount flag rule: variance value over KES 1,500 or quantity variance over 15%
        const isLargeCostDiscrepancy = Math.abs(varianceCost) > 1500;
        const isLargePercentDiscrepancy = expected > 0 && Math.abs(varianceQty / expected) > 0.15;
        const recountRequired = isLargeCostDiscrepancy || isLargePercentDiscrepancy;
        const [updated] = await db_1.db
            .update(schema_1.stockCountItems)
            .set({
            countedQuantity: counted.toFixed(4),
            varianceQuantity: varianceQty.toFixed(4),
            varianceCost: varianceCost.toFixed(4),
            recountRequired,
            notes: payload.notes || null,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.id, line.id))
            .returning();
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateStockCountLine = updateStockCountLine;
// 5. Reconcile Stocktake (Posts Double-Entry Material Ledgers & Closes Audit)
const reconcileStockCount = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_count_validator_1.reconcileStockCountSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [header] = await tx
                .select()
                .from(schema_1.stockCounts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockCounts.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.stockCounts.tenantId, tenantId)))
                .limit(1);
            if (!header)
                throw new Error('Stock count session not found');
            if (header.status === 'RECONCILED')
                throw new Error('This audit session has already been reconciled');
            const items = await tx
                .select()
                .from(schema_1.stockCountItems)
                .where((0, drizzle_orm_1.eq)(schema_1.stockCountItems.stockCountId, header.id));
            let netVarianceCost = 0;
            let discrepancyCount = 0;
            for (const line of items) {
                if (line.countedQuantity === null) {
                    throw new Error('All listed inventory items must be counted before final reconciliation');
                }
                const varianceQty = parseFloat(line.varianceQuantity || '0');
                const unitCost = parseFloat(line.unitCost || '0');
                const varianceCost = parseFloat(line.varianceCost || '0');
                netVarianceCost += varianceCost;
                if (varianceQty !== 0) {
                    discrepancyCount++;
                    const [invItem] = await tx
                        .select()
                        .from(schema_1.inventoryItems)
                        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, line.inventoryItemId))
                        .limit(1);
                    if (invItem) {
                        const countedQtyNum = parseFloat(line.countedQuantity) || 0;
                        const totalValuation = Math.abs(varianceQty) * unitCost;
                        // 1. Post compensating physical inventory adjustment ledger
                        await tx.insert(schema_1.stockMovements).values({
                            tenantId,
                            branchId: header.branchId || branchId,
                            inventoryItemId: line.inventoryItemId,
                            userId: userId ? Number(userId) : null,
                            type: 'PHYSICAL_INVENTORY_ADJ',
                            quantity: varianceQty.toFixed(4),
                            unitCost: unitCost.toFixed(4),
                            totalValuation: totalValuation.toFixed(4),
                            balanceAfter: countedQtyNum.toFixed(4),
                            documentReference: header.countNumber,
                            locationBin: 'Physical Audit Recalibration',
                            notes: `Stock count variance adjustment for ${header.countNumber}`,
                        });
                        // 2. Align current on-hand stock with physical count
                        await tx
                            .update(schema_1.inventoryItems)
                            .set({
                            currentStock: countedQtyNum.toFixed(4),
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, invItem.id));
                    }
                }
            }
            // 3. Mark audit session as reconciled
            const [reconciled] = await tx
                .update(schema_1.stockCounts)
                .set({
                status: 'RECONCILED',
                reconciledAt: new Date(),
                approvedById: userId ? Number(userId) : null,
                discrepancyItemsCount: discrepancyCount,
                netVarianceCost: netVarianceCost.toFixed(4),
                notes: payload.notes || header.notes,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.stockCounts.id, header.id))
                .returning();
            return reconciled;
        });
        res.status(200).json({
            status: 'success',
            message: `Stocktake ${result.countNumber} reconciled. All inventory variances adjusted in the material ledger.`,
            data: result,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.reconcileStockCount = reconcileStockCount;
