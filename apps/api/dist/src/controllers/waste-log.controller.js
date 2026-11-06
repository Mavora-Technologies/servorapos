"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWasteLog = exports.getWasteLogs = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const waste_log_validator_1 = require("../validators/waste-log.validator");
// 1. Get All Waste Records with Enterprise Telemetry & Cost Center Breakdown
const getWasteLogs = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const logs = await db_1.db
            .select({
            id: schema_1.wasteLogs.id,
            inventoryItemId: schema_1.wasteLogs.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            itemCategory: schema_1.inventoryItems.category,
            inventoryBatchId: schema_1.wasteLogs.inventoryBatchId,
            batchNumber: schema_1.inventoryBatches.batchNumber,
            branchId: schema_1.wasteLogs.branchId,
            branchName: schema_1.branches.name,
            department: schema_1.wasteLogs.department,
            wasteReason: schema_1.wasteLogs.wasteReason,
            dispositionMethod: schema_1.wasteLogs.dispositionMethod,
            locationBin: schema_1.wasteLogs.locationBin,
            documentReference: schema_1.wasteLogs.documentReference,
            quantity: schema_1.wasteLogs.quantity,
            unitCost: schema_1.wasteLogs.unitCost,
            totalLossCost: schema_1.wasteLogs.totalLossCost,
            reportedById: schema_1.wasteLogs.reportedById,
            reporterEmail: schema_1.users.email,
            notes: schema_1.wasteLogs.notes,
            loggedAt: schema_1.wasteLogs.loggedAt,
        })
            .from(schema_1.wasteLogs)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.wasteLogs.inventoryItemId, schema_1.inventoryItems.id))
            .leftJoin(schema_1.inventoryBatches, (0, drizzle_orm_1.eq)(schema_1.wasteLogs.inventoryBatchId, schema_1.inventoryBatches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.wasteLogs.reportedById, schema_1.users.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.wasteLogs.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.eq)(schema_1.wasteLogs.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.wasteLogs.loggedAt));
        let totalLossValuation = 0;
        const reasonBreakdown = {};
        const departmentBreakdown = {};
        logs.forEach((log) => {
            const loss = parseFloat(log.totalLossCost) || 0;
            totalLossValuation += loss;
            // Reason breakdown
            if (!reasonBreakdown[log.wasteReason]) {
                reasonBreakdown[log.wasteReason] = { count: 0, loss: 0 };
            }
            reasonBreakdown[log.wasteReason].count += 1;
            reasonBreakdown[log.wasteReason].loss += loss;
            // Department cost-center breakdown
            if (!departmentBreakdown[log.department]) {
                departmentBreakdown[log.department] = { count: 0, loss: 0 };
            }
            departmentBreakdown[log.department].count += 1;
            departmentBreakdown[log.department].loss += loss;
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalEntries: logs.length,
                    totalLossValuation: Number(totalLossValuation.toFixed(2)),
                    reasonBreakdown,
                    departmentBreakdown,
                },
                logs,
            },
        });
    }
    catch (error) {
        console.error('[Get Waste Logs Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch waste records' });
    }
};
exports.getWasteLogs = getWasteLogs;
// 2. Post Waste Incident with Compliant Material Movement & Batch Depletion
const createWasteLog = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = waste_log_validator_1.createWasteLogSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            // 1. Fetch item master
            const [item] = await tx
                .select()
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, payload.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                .limit(1);
            if (!item)
                throw new Error('Inventory item not found');
            const currentStockNum = parseFloat(item.currentStock) || 0;
            const wasteQty = payload.quantity;
            const unitCost = payload.unitCost !== undefined ? payload.unitCost : parseFloat(item.costPrice) || 0;
            const totalLoss = wasteQty * unitCost;
            const newBalance = currentStockNum - wasteQty;
            if (!item.allowNegativeStock && newBalance < 0) {
                throw new Error(`Cannot write off ${wasteQty} ${item.unit}. Only ${currentStockNum} ${item.unit} currently on-hand.`);
            }
            // Generate Material Document Ref
            const scrapDocNum = `WST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // 2. If a specific batch/lot was designated, deduct from the batch
            let batchNumberStr = null;
            if (payload.inventoryBatchId) {
                const [batch] = await tx
                    .select()
                    .from(schema_1.inventoryBatches)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.id, payload.inventoryBatchId), (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId)))
                    .limit(1);
                if (batch) {
                    batchNumberStr = batch.batchNumber;
                    const currentBatchQty = parseFloat(batch.currentQuantity) || 0;
                    const newBatchQty = Math.max(0, currentBatchQty - wasteQty);
                    await tx
                        .update(schema_1.inventoryBatches)
                        .set({
                        currentQuantity: newBatchQty.toFixed(4),
                        status: newBatchQty <= 0 ? 'DISCARDED' : batch.status,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.id, batch.id));
                }
            }
            // 3. Insert into waste_logs
            const [wasteEntry] = await tx
                .insert(schema_1.wasteLogs)
                .values({
                tenantId: Number(tenantId),
                branchId,
                inventoryItemId: payload.inventoryItemId,
                inventoryBatchId: payload.inventoryBatchId || null,
                department: payload.department,
                wasteReason: payload.wasteReason,
                dispositionMethod: payload.dispositionMethod,
                quantity: wasteQty.toFixed(4),
                unitCost: unitCost.toFixed(4),
                totalLossCost: totalLoss.toFixed(4),
                locationBin: payload.locationBin?.trim() || 'Kitchen Floor Station',
                documentReference: scrapDocNum,
                reportedById: userId ? Number(userId) : null,
                notes: payload.witnessName
                    ? `${payload.notes || ''} [Witness: ${payload.witnessName}]`.trim()
                    : payload.notes || null,
                loggedAt: payload.loggedAt ? new Date(payload.loggedAt) : new Date(),
            })
                .returning();
            // 4. Post compliant WASTE_SCRAP movement into stock_movements
            await tx.insert(schema_1.stockMovements).values({
                tenantId: Number(tenantId),
                branchId,
                inventoryItemId: payload.inventoryItemId,
                userId: userId ? Number(userId) : null,
                type: 'WASTE_SCRAP',
                quantity: (-wasteQty).toFixed(4),
                unitCost: unitCost.toFixed(4),
                totalValuation: totalLoss.toFixed(4),
                balanceAfter: newBalance.toFixed(4),
                batchNumber: batchNumberStr,
                locationBin: payload.locationBin?.trim() || 'Kitchen Floor Station',
                documentReference: scrapDocNum,
                notes: `Waste Incident [${payload.wasteReason} - ${payload.department}]: ${payload.notes || 'Kitchen floor write-off'}`,
            });
            // 5. Update master stock
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: newBalance.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.id));
            return wasteEntry;
        });
        res.status(201).json({ status: 'success', data: result, message: 'Stock written off and financial loss recorded' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createWasteLog = createWasteLog;
