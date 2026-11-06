"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogisticsFleetList = exports.receiveStockTransfer = exports.dispatchStockTransfer = exports.createStockTransfer = exports.getStockTransferDetails = exports.getStockTransfers = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const stock_transfer_validator_1 = require("../validators/stock-transfer.validator");
const sourceBranches = (0, drizzle_orm_1.aliasedTable)(schema_1.branches, 'source_branches');
const destBranches = (0, drizzle_orm_1.aliasedTable)(schema_1.branches, 'dest_branches');
// 1. Get All Transfers with Fleet & Valuation Telemetry
const getStockTransfers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const transfers = await db_1.db
            .select({
            id: schema_1.stockTransfers.id,
            transferNumber: schema_1.stockTransfers.transferNumber,
            status: schema_1.stockTransfers.status,
            sourceBranchId: schema_1.stockTransfers.sourceBranchId,
            sourceBranchName: sourceBranches.name,
            destinationBranchId: schema_1.stockTransfers.destinationBranchId,
            destinationBranchName: destBranches.name,
            carrierVehiclePlate: schema_1.stockTransfers.carrierVehiclePlate,
            driverName: schema_1.stockTransfers.driverName,
            dispatchTempProbe: schema_1.stockTransfers.dispatchTempProbe,
            arrivalTempProbe: schema_1.stockTransfers.arrivalTempProbe,
            totalValuation: schema_1.stockTransfers.totalValuation,
            transitLossValuation: schema_1.stockTransfers.transitLossValuation,
            notes: schema_1.stockTransfers.notes,
            dispatchedAt: schema_1.stockTransfers.dispatchedAt,
            receivedAt: schema_1.stockTransfers.receivedAt,
            createdAt: schema_1.stockTransfers.createdAt,
            requesterEmail: schema_1.users.email,
        })
            .from(schema_1.stockTransfers)
            .innerJoin(sourceBranches, (0, drizzle_orm_1.eq)(schema_1.stockTransfers.sourceBranchId, sourceBranches.id))
            .innerJoin(destBranches, (0, drizzle_orm_1.eq)(schema_1.stockTransfers.destinationBranchId, destBranches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.stockTransfers.requestedById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.stockTransfers.createdAt));
        let inTransitValuation = 0;
        let pendingCount = 0;
        let activeTransitCount = 0;
        transfers.forEach((t) => {
            if (t.status === 'IN_TRANSIT') {
                inTransitValuation += parseFloat(t.totalValuation) || 0;
                activeTransitCount++;
            }
            else if (t.status === 'PENDING') {
                pendingCount++;
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalTransfers: transfers.length,
                    activeTransitCount,
                    pendingCount,
                    inTransitValuation: Number(inTransitValuation.toFixed(2)),
                },
                transfers,
            },
        });
    }
    catch (error) {
        console.error('[Get Stock Transfers Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch stock transfers' });
    }
};
exports.getStockTransfers = getStockTransfers;
// 2. Get Single Transfer Manifest with Line Items
const getStockTransferDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [transfer] = await db_1.db
            .select({
            id: schema_1.stockTransfers.id,
            transferNumber: schema_1.stockTransfers.transferNumber,
            status: schema_1.stockTransfers.status,
            sourceBranchId: schema_1.stockTransfers.sourceBranchId,
            sourceBranchName: sourceBranches.name,
            destinationBranchId: schema_1.stockTransfers.destinationBranchId,
            destinationBranchName: destBranches.name,
            carrierVehiclePlate: schema_1.stockTransfers.carrierVehiclePlate,
            driverName: schema_1.stockTransfers.driverName,
            dispatchTempProbe: schema_1.stockTransfers.dispatchTempProbe,
            arrivalTempProbe: schema_1.stockTransfers.arrivalTempProbe,
            totalValuation: schema_1.stockTransfers.totalValuation,
            transitLossValuation: schema_1.stockTransfers.transitLossValuation,
            notes: schema_1.stockTransfers.notes,
            dispatchedAt: schema_1.stockTransfers.dispatchedAt,
            receivedAt: schema_1.stockTransfers.receivedAt,
            createdAt: schema_1.stockTransfers.createdAt,
            requesterEmail: schema_1.users.email,
        })
            .from(schema_1.stockTransfers)
            .innerJoin(sourceBranches, (0, drizzle_orm_1.eq)(schema_1.stockTransfers.sourceBranchId, sourceBranches.id))
            .innerJoin(destBranches, (0, drizzle_orm_1.eq)(schema_1.stockTransfers.destinationBranchId, destBranches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.stockTransfers.requestedById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId)))
            .limit(1);
        if (!transfer) {
            res.status(404).json({ status: 'error', message: 'Stock transfer record not found' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.stockTransferItems.id,
            inventoryItemId: schema_1.stockTransferItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            itemCategory: schema_1.inventoryItems.category,
            currentSourceStock: schema_1.inventoryItems.currentStock,
            requestedQuantity: schema_1.stockTransferItems.requestedQuantity,
            sentQuantity: schema_1.stockTransferItems.sentQuantity,
            receivedQuantity: schema_1.stockTransferItems.receivedQuantity,
            transitLossQuantity: schema_1.stockTransferItems.transitLossQuantity,
            unitCost: schema_1.stockTransferItems.unitCost,
            batchNumber: schema_1.stockTransferItems.batchNumber,
            notes: schema_1.stockTransferItems.notes,
        })
            .from(schema_1.stockTransferItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.stockTransferItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.stockTransferItems.transferId, transfer.id));
        res.status(200).json({ status: 'success', data: { ...transfer, items } });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getStockTransferDetails = getStockTransferDetails;
// 3. Create Transfer Requisition
const createStockTransfer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_transfer_validator_1.createTransferSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const transferNum = `STO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            let estimatedValuation = 0;
            const itemRows = [];
            for (const item of payload.items) {
                const [invItem] = await tx
                    .select({ costPrice: schema_1.inventoryItems.costPrice })
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                    .limit(1);
                const costNum = parseFloat(item.unitCost?.toString() || invItem?.costPrice || '0');
                const lineTotal = item.requestedQuantity * costNum;
                estimatedValuation += lineTotal;
                itemRows.push({
                    inventoryItemId: item.inventoryItemId,
                    requestedQuantity: item.requestedQuantity.toFixed(4),
                    unitCost: costNum.toFixed(4),
                });
            }
            const [transfer] = await tx
                .insert(schema_1.stockTransfers)
                .values({
                tenantId,
                transferNumber: transferNum,
                sourceBranchId: payload.sourceBranchId,
                destinationBranchId: payload.destinationBranchId,
                status: 'PENDING',
                totalValuation: estimatedValuation.toFixed(4),
                requestedById: userId ? Number(userId) : null,
                notes: payload.notes || null,
            })
                .returning();
            await tx.insert(schema_1.stockTransferItems).values(itemRows.map((r) => ({
                ...r,
                transferId: transfer.id,
            })));
            return transfer;
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
exports.createStockTransfer = createStockTransfer;
// 4. Dispatch Transfer (Deducts stock from source warehouse, moves to in-transit)
const dispatchStockTransfer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_transfer_validator_1.dispatchTransferSchema.parse(req.body);
        await db_1.db.transaction(async (tx) => {
            const [transfer] = await tx
                .select()
                .from(schema_1.stockTransfers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId)))
                .limit(1);
            if (!transfer)
                throw new Error('Transfer record not found');
            if (transfer.status !== 'PENDING')
                throw new Error(`Transfer cannot be dispatched in state: ${transfer.status}`);
            let dispatchedValuation = 0;
            for (const itemUpdate of payload.items) {
                const [line] = await tx
                    .select()
                    .from(schema_1.stockTransferItems)
                    .where((0, drizzle_orm_1.eq)(schema_1.stockTransferItems.id, itemUpdate.itemId))
                    .limit(1);
                if (!line)
                    continue;
                const sentQty = itemUpdate.sentQuantity;
                const unitCostNum = parseFloat(line.unitCost);
                const lineValuation = sentQty * unitCostNum;
                dispatchedValuation += lineValuation;
                const [inv] = await tx
                    .select()
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, line.inventoryItemId))
                    .limit(1);
                if (!inv)
                    throw new Error(`Inventory item ${line.inventoryItemId} not found`);
                const currentStockNum = parseFloat(inv.currentStock);
                const newBalance = currentStockNum - sentQty;
                if (!inv.allowNegativeStock && newBalance < 0) {
                    throw new Error(`Insufficient stock for ${inv.name}. Available: ${currentStockNum} ${inv.unit}`);
                }
                // 1. Update transfer item line
                await tx
                    .update(schema_1.stockTransferItems)
                    .set({
                    sentQuantity: sentQty.toFixed(4),
                    batchNumber: itemUpdate.batchNumber || null,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.stockTransferItems.id, line.id));
                // 2. Post Outward Material Document Ledger
                await tx.insert(schema_1.stockMovements).values({
                    tenantId: Number(tenantId),
                    branchId: Number(transfer.sourceBranchId),
                    inventoryItemId: line.inventoryItemId,
                    userId: userId ? Number(userId) : null,
                    type: 'TRANSFER',
                    quantity: (-sentQty).toFixed(4),
                    unitCost: unitCostNum.toFixed(4),
                    totalValuation: lineValuation.toFixed(4),
                    balanceAfter: newBalance.toFixed(4),
                    batchNumber: itemUpdate.batchNumber || null,
                    documentReference: transfer.transferNumber,
                    locationBin: 'Dispatched to In-Transit Fleet',
                    notes: `Outward Goods Issue: STO #${transfer.transferNumber}`,
                });
                // 3. Deduct source inventory stock
                await tx
                    .update(schema_1.inventoryItems)
                    .set({ currentStock: newBalance.toFixed(4), updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, inv.id));
            }
            await tx
                .update(schema_1.stockTransfers)
                .set({
                status: 'IN_TRANSIT',
                carrierVehiclePlate: payload.carrierVehiclePlate || null,
                driverName: payload.driverName || null,
                dispatchTempProbe: payload.dispatchTempProbe !== undefined ? payload.dispatchTempProbe?.toString() : null,
                totalValuation: dispatchedValuation.toFixed(4),
                dispatchedById: userId ? Number(userId) : null,
                dispatchedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, transfer.id));
        });
        res.status(200).json({ status: 'success', message: 'Consignment successfully dispatched into in-transit fleet custody' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.dispatchStockTransfer = dispatchStockTransfer;
// 5. Receive Transfer with In-Transit Shrinkage Write-off
const receiveStockTransfer = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_transfer_validator_1.receiveTransferSchema.parse(req.body);
        await db_1.db.transaction(async (tx) => {
            const [transfer] = await tx
                .select()
                .from(schema_1.stockTransfers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.stockTransfers.tenantId, tenantId)))
                .limit(1);
            if (!transfer)
                throw new Error('Transfer record not found');
            if (transfer.status !== 'IN_TRANSIT')
                throw new Error('Only IN_TRANSIT consignments can be received');
            let totalTransitLossCost = 0;
            let hasDiscrepancy = false;
            for (const itemUpdate of payload.items) {
                const [line] = await tx
                    .select()
                    .from(schema_1.stockTransferItems)
                    .where((0, drizzle_orm_1.eq)(schema_1.stockTransferItems.id, itemUpdate.itemId))
                    .limit(1);
                if (!line)
                    continue;
                const sentQty = parseFloat(line.sentQuantity || '0');
                const recvQty = itemUpdate.receivedQuantity;
                const unitCostNum = parseFloat(line.unitCost);
                const lossQty = Math.max(0, sentQty - recvQty);
                const lossCost = lossQty * unitCostNum;
                totalTransitLossCost += lossCost;
                if (lossQty > 0) {
                    hasDiscrepancy = true;
                }
                const [inv] = await tx
                    .select()
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, line.inventoryItemId))
                    .limit(1);
                const currentStockNum = parseFloat(inv.currentStock);
                const newBalance = currentStockNum + recvQty;
                const receivedValuation = recvQty * unitCostNum;
                // 1. Update line quantities and shrinkage
                await tx
                    .update(schema_1.stockTransferItems)
                    .set({
                    receivedQuantity: recvQty.toFixed(4),
                    transitLossQuantity: lossQty.toFixed(4),
                    notes: itemUpdate.notes || line.notes,
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.stockTransferItems.id, line.id));
                // 2. Post Destination Inward Material Document
                if (recvQty > 0) {
                    await tx.insert(schema_1.stockMovements).values({
                        tenantId: Number(tenantId),
                        branchId: Number(transfer.destinationBranchId),
                        inventoryItemId: line.inventoryItemId,
                        userId: userId ? Number(userId) : null,
                        type: 'TRANSFER',
                        quantity: recvQty.toFixed(4),
                        unitCost: unitCostNum.toFixed(4),
                        totalValuation: receivedValuation.toFixed(4),
                        balanceAfter: newBalance.toFixed(4),
                        batchNumber: line.batchNumber || null,
                        documentReference: transfer.transferNumber,
                        locationBin: 'Branch Storage Receiving',
                        notes: `Inward Goods Receipt: STO #${transfer.transferNumber}`,
                    });
                    // Credit destination inventory
                    await tx
                        .update(schema_1.inventoryItems)
                        .set({ currentStock: newBalance.toFixed(4), updatedAt: new Date() })
                        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, inv.id));
                }
                // 3. Post Transit Shrinkage / Loss Scrap Entry if loss occurred
                if (lossQty > 0) {
                    await tx.insert(schema_1.stockMovements).values({
                        tenantId: Number(tenantId),
                        branchId: Number(transfer.destinationBranchId),
                        inventoryItemId: line.inventoryItemId,
                        userId: userId ? Number(userId) : null,
                        type: 'WASTE_SCRAP',
                        quantity: (-lossQty).toFixed(4),
                        unitCost: unitCostNum.toFixed(4),
                        totalValuation: lossCost.toFixed(4),
                        balanceAfter: newBalance.toFixed(4),
                        batchNumber: line.batchNumber || null,
                        documentReference: transfer.transferNumber,
                        locationBin: 'In-Transit Loss Write-off',
                        notes: `Transit Spoilage / Shrinkage loss during shipment STO #${transfer.transferNumber}`,
                    });
                }
            }
            await tx
                .update(schema_1.stockTransfers)
                .set({
                status: hasDiscrepancy ? 'DISCREPANCY_COMPLETED' : 'COMPLETED',
                arrivalTempProbe: payload.arrivalTempProbe !== undefined ? payload.arrivalTempProbe?.toString() : null,
                transitLossValuation: totalTransitLossCost.toFixed(4),
                receivedById: userId ? Number(userId) : null,
                receivedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.stockTransfers.id, transfer.id));
        });
        res.status(200).json({ status: 'success', message: 'Consignment received and inventory ledger balanced' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.receiveStockTransfer = receiveStockTransfer;
// 6. Get Active Logistics Fleet for Dispatch Waybills
const getLogisticsFleetList = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const fleet = await db_1.db
            .select({
            id: schema_1.logisticsFleet.id,
            vehiclePlate: schema_1.logisticsFleet.vehiclePlate,
            vehicleType: schema_1.logisticsFleet.vehicleType,
            driverName: schema_1.logisticsFleet.driverName,
            driverPhone: schema_1.logisticsFleet.driverPhone,
            isRefrigerated: schema_1.logisticsFleet.isRefrigerated,
            minTargetTemp: schema_1.logisticsFleet.minTargetTemp,
            maxTargetTemp: schema_1.logisticsFleet.maxTargetTemp,
        })
            .from(schema_1.logisticsFleet)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.logisticsFleet.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.logisticsFleet.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.logisticsFleet.id));
        res.status(200).json({ status: 'success', data: fleet });
    }
    catch (error) {
        console.error('[Get Logistics Fleet Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getLogisticsFleetList = getLogisticsFleetList;
