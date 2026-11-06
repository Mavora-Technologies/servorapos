"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseStockMovement = exports.createManualMovement = exports.getStockMovements = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const stock_movement_validator_1 = require("../validators/stock-movement.validator");
// 1. Get Stock Movements with Enterprise Telemetry
const getStockMovements = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
        const movements = await db_1.db
            .select({
            id: schema_1.stockMovements.id,
            inventoryItemId: schema_1.stockMovements.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            itemCategory: schema_1.inventoryItems.category,
            orderId: schema_1.stockMovements.orderId,
            userId: schema_1.stockMovements.userId,
            userName: schema_1.users.email,
            type: schema_1.stockMovements.type,
            quantity: schema_1.stockMovements.quantity,
            unitCost: schema_1.stockMovements.unitCost,
            totalValuation: schema_1.stockMovements.totalValuation,
            balanceAfter: schema_1.stockMovements.balanceAfter,
            batchNumber: schema_1.stockMovements.batchNumber,
            locationBin: schema_1.stockMovements.locationBin,
            documentReference: schema_1.stockMovements.documentReference,
            reversedMovementId: schema_1.stockMovements.reversedMovementId,
            isReversed: schema_1.stockMovements.isReversed,
            notes: schema_1.stockMovements.notes,
            createdAt: schema_1.stockMovements.createdAt,
        })
            .from(schema_1.stockMovements)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.stockMovements.inventoryItemId, schema_1.inventoryItems.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.stockMovements.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.stockMovements.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.stockMovements.createdAt))
            .limit(limit);
        // Calculate audit aggregations
        let totalInflowValuation = 0;
        let totalOutflowValuation = 0;
        movements.forEach((m) => {
            const val = parseFloat(m.totalValuation) || 0;
            const qty = parseFloat(m.quantity) || 0;
            if (qty > 0) {
                totalInflowValuation += val;
            }
            else {
                totalOutflowValuation += val;
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalEntries: movements.length,
                    totalInflowValuation: Number(totalInflowValuation.toFixed(2)),
                    totalOutflowValuation: Number(totalOutflowValuation.toFixed(2)),
                },
                movements,
            },
        });
    }
    catch (error) {
        console.error('[Get Stock Movements Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch movements' });
    }
};
exports.getStockMovements = getStockMovements;
// 2. Post Manual Movement (Audit-Safe ACID Transaction)
const createManualMovement = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_movement_validator_1.createManualMovementSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [item] = await tx
                .select()
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, payload.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                .limit(1);
            if (!item)
                throw new Error('Inventory item not found');
            const currentStockNum = parseFloat(item.currentStock) || 0;
            const qtyDelta = payload.quantityDelta;
            const newBalance = currentStockNum + qtyDelta;
            if (!item.allowNegativeStock && newBalance < 0) {
                throw new Error(`Insufficient stock for ${item.name}. On hand: ${currentStockNum}, attempting delta: ${qtyDelta}`);
            }
            const costPrice = payload.unitCost !== undefined ? payload.unitCost : parseFloat(item.costPrice) || 0;
            const totalValuation = Math.abs(qtyDelta) * costPrice;
            const [movement] = await tx
                .insert(schema_1.stockMovements)
                .values({
                tenantId,
                branchId: branchId || null,
                inventoryItemId: payload.inventoryItemId,
                userId: userId ? Number(userId) : null,
                type: payload.type,
                quantity: qtyDelta.toFixed(4),
                unitCost: costPrice.toFixed(4),
                totalValuation: totalValuation.toFixed(4),
                balanceAfter: newBalance.toFixed(4),
                batchNumber: payload.batchNumber || null,
                locationBin: payload.locationBin || null,
                documentReference: payload.documentReference || null,
                notes: payload.notes || null,
            })
                .returning();
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: newBalance.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.id));
            return movement;
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
exports.createManualMovement = createManualMovement;
// 3. Storno Reversal (Compensating Accounting Transaction)
const reverseStockMovement = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_movement_validator_1.reverseMovementSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [origin] = await tx
                .select()
                .from(schema_1.stockMovements)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockMovements.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.stockMovements.tenantId, tenantId)))
                .limit(1);
            if (!origin)
                throw new Error('Original movement record not found');
            if (origin.isReversed)
                throw new Error('This movement has already been reversed');
            const [item] = await tx
                .select()
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, origin.inventoryItemId))
                .limit(1);
            if (!item)
                throw new Error('Inventory item no longer exists');
            const currentStockNum = parseFloat(item.currentStock) || 0;
            const originQty = parseFloat(origin.quantity) || 0;
            const compensatingQty = -originQty; // Exact opposite delta
            const newBalance = currentStockNum + compensatingQty;
            if (!item.allowNegativeStock && newBalance < 0) {
                throw new Error(`Cannot reverse: resulting balance would be negative (${newBalance})`);
            }
            const unitCost = parseFloat(origin.unitCost) || 0;
            const totalValuation = Math.abs(compensatingQty) * unitCost;
            // 1. Post compensating STORNO_REVERSAL movement
            const [reversalMove] = await tx
                .insert(schema_1.stockMovements)
                .values({
                tenantId,
                branchId: branchId || null,
                inventoryItemId: origin.inventoryItemId,
                userId: userId ? Number(userId) : null,
                type: 'STORNO_REVERSAL',
                quantity: compensatingQty.toFixed(4),
                unitCost: unitCost.toFixed(4),
                totalValuation: totalValuation.toFixed(4),
                balanceAfter: newBalance.toFixed(4),
                reversedMovementId: origin.id,
                documentReference: `REV-${origin.id}`,
                notes: `Storno reversal of movement #${origin.id}. Reason: ${payload.reason}`,
            })
                .returning();
            // 2. Mark original movement as reversed
            await tx
                .update(schema_1.stockMovements)
                .set({ isReversed: true })
                .where((0, drizzle_orm_1.eq)(schema_1.stockMovements.id, origin.id));
            // 3. Compensate item balance
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: newBalance.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.id));
            return reversalMove;
        });
        res.status(200).json({ status: 'success', message: 'Movement reversed successfully', data: result });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.reverseStockMovement = reverseStockMovement;
