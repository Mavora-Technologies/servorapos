"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processGoodsReceiving = exports.getGoodsReceivedDetails = exports.getGoodsReceivedNotes = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const goods_received_validator_1 = require("../validators/goods-received.validator");
// 1. Get all Goods Received Notes (GRN History)
const getGoodsReceivedNotes = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const grns = await db_1.db
            .select({
            id: schema_1.goodsReceivedNotes.id,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            supplierDeliveryNote: schema_1.goodsReceivedNotes.supplierDeliveryNote,
            receivedDate: schema_1.goodsReceivedNotes.receivedDate,
            purchaseOrderId: schema_1.goodsReceivedNotes.purchaseOrderId,
            poNumber: schema_1.purchaseOrders.poNumber,
            supplierId: schema_1.goodsReceivedNotes.supplierId,
            supplierName: schema_1.suppliers.name,
            branchId: schema_1.goodsReceivedNotes.branchId,
            branchName: schema_1.branches.name,
            receiverEmail: schema_1.users.email,
            notes: schema_1.goodsReceivedNotes.notes,
            createdAt: schema_1.goodsReceivedNotes.createdAt,
        })
            .from(schema_1.goodsReceivedNotes)
            .innerJoin(schema_1.purchaseOrders, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.purchaseOrderId, schema_1.purchaseOrders.id))
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.receivedById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.goodsReceivedNotes.receivedDate));
        res.status(200).json({ status: 'success', data: grns });
    }
    catch (error) {
        console.error('[Get GRN Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch GRN logs' });
    }
};
exports.getGoodsReceivedNotes = getGoodsReceivedNotes;
// 2. Get Single GRN Details with Line Inspection Breakdown
const getGoodsReceivedDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [grn] = await db_1.db
            .select({
            id: schema_1.goodsReceivedNotes.id,
            grnNumber: schema_1.goodsReceivedNotes.grnNumber,
            supplierDeliveryNote: schema_1.goodsReceivedNotes.supplierDeliveryNote,
            receivedDate: schema_1.goodsReceivedNotes.receivedDate,
            purchaseOrderId: schema_1.goodsReceivedNotes.purchaseOrderId,
            poNumber: schema_1.purchaseOrders.poNumber,
            supplierId: schema_1.goodsReceivedNotes.supplierId,
            supplierName: schema_1.suppliers.name,
            branchId: schema_1.goodsReceivedNotes.branchId,
            branchName: schema_1.branches.name,
            receiverEmail: schema_1.users.email,
            notes: schema_1.goodsReceivedNotes.notes,
            createdAt: schema_1.goodsReceivedNotes.createdAt,
        })
            .from(schema_1.goodsReceivedNotes)
            .innerJoin(schema_1.purchaseOrders, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.purchaseOrderId, schema_1.purchaseOrders.id))
            .innerJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.receivedById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.goodsReceivedNotes.tenantId, tenantId)))
            .limit(1);
        if (!grn) {
            res.status(404).json({ status: 'error', message: 'GRN record not found' });
            return;
        }
        const items = await db_1.db
            .select({
            id: schema_1.goodsReceivedItems.id,
            inventoryItemId: schema_1.goodsReceivedItems.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            quantityAccepted: schema_1.goodsReceivedItems.quantityAccepted,
            quantityRejected: schema_1.goodsReceivedItems.quantityRejected,
            unitCost: schema_1.goodsReceivedItems.unitCost,
            rejectionReason: schema_1.goodsReceivedItems.rejectionReason,
            notes: schema_1.goodsReceivedItems.notes,
        })
            .from(schema_1.goodsReceivedItems)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.goodsReceivedItems.inventoryItemId, schema_1.inventoryItems.id))
            .where((0, drizzle_orm_1.eq)(schema_1.goodsReceivedItems.grnId, grn.id));
        res.status(200).json({ status: 'success', data: { ...grn, items } });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getGoodsReceivedDetails = getGoodsReceivedDetails;
// 3. Receive Goods Delivery (Transactionally updates live stock, PO fulfillment, and ledger)
const processGoodsReceiving = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = goods_received_validator_1.createGoodsReceivedSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            // 1. Verify PO existence and state
            const [po] = await tx
                .select()
                .from(schema_1.purchaseOrders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.id, payload.purchaseOrderId), (0, drizzle_orm_1.eq)(schema_1.purchaseOrders.tenantId, tenantId)))
                .limit(1);
            if (!po)
                throw new Error('Purchase order not found');
            if (po.status === 'COMPLETED')
                throw new Error('Purchase order has already been fully received');
            if (po.status === 'CANCELLED')
                throw new Error('Cannot receive against a cancelled purchase order');
            // Sanitize branch ID to clean integer or null
            const effectiveBranchId = po.branchId
                ? Number(po.branchId)
                : rawBranchId
                    ? Number(rawBranchId)
                    : null;
            const grnNum = `GRN-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // 2. Create Goods Received Note record
            const [grn] = await tx
                .insert(schema_1.goodsReceivedNotes)
                .values({
                tenantId: Number(tenantId),
                branchId: effectiveBranchId,
                purchaseOrderId: po.id,
                supplierId: po.supplierId,
                grnNumber: grnNum,
                supplierDeliveryNote: payload.supplierDeliveryNote || null,
                receivedById: userId ? Number(userId) : null,
                notes: payload.notes || null,
            })
                .returning();
            // 3. Process each line item
            const poItems = await tx
                .select()
                .from(schema_1.purchaseOrderItems)
                .where((0, drizzle_orm_1.eq)(schema_1.purchaseOrderItems.purchaseOrderId, po.id));
            let allLinesFullyReceived = true;
            for (const line of payload.items) {
                const qtyAccepted = Number(line.quantityAccepted) || 0;
                const qtyRejected = Number(line.quantityRejected) || 0;
                const unitCostNum = Number(line.unitCost) || 0;
                // Save GRN line
                await tx.insert(schema_1.goodsReceivedItems).values({
                    grnId: grn.id,
                    inventoryItemId: line.inventoryItemId,
                    quantityAccepted: qtyAccepted.toFixed(4),
                    quantityRejected: qtyRejected.toFixed(4),
                    unitCost: unitCostNum.toFixed(4),
                    rejectionReason: line.rejectionReason || null,
                    notes: line.notes || null,
                });
                // Update corresponding PO item cumulative received quantity
                const matchingPoItem = poItems.find((p) => p.inventoryItemId === line.inventoryItemId);
                if (matchingPoItem) {
                    const currentRcvd = parseFloat(matchingPoItem.quantityReceived) || 0;
                    const newRcvd = currentRcvd + qtyAccepted;
                    const ordered = parseFloat(matchingPoItem.quantityOrdered) || 0;
                    await tx
                        .update(schema_1.purchaseOrderItems)
                        .set({ quantityReceived: newRcvd.toFixed(4) })
                        .where((0, drizzle_orm_1.eq)(schema_1.purchaseOrderItems.id, matchingPoItem.id));
                    if (newRcvd < ordered) {
                        allLinesFullyReceived = false;
                    }
                }
                // Increment actual inventory balance & log stock movement
                if (qtyAccepted > 0) {
                    const [inv] = await tx
                        .select()
                        .from(schema_1.inventoryItems)
                        .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, line.inventoryItemId))
                        .limit(1);
                    if (inv) {
                        const currentStockNum = parseFloat(inv.currentStock) || 0;
                        const newBalance = currentStockNum + qtyAccepted;
                        const totalValuation = qtyAccepted * unitCostNum;
                        // Audit ledger entry (with totalValuation and documentReference populated)
                        await tx.insert(schema_1.stockMovements).values({
                            tenantId: Number(tenantId),
                            branchId: effectiveBranchId,
                            inventoryItemId: line.inventoryItemId,
                            userId: userId ? Number(userId) : null,
                            type: 'GOODS_RECEIPT_PO', // or 'PURCHASE'
                            quantity: qtyAccepted.toFixed(4),
                            unitCost: unitCostNum.toFixed(4),
                            totalValuation: totalValuation.toFixed(4),
                            balanceAfter: newBalance.toFixed(4),
                            documentReference: grn.grnNumber,
                            locationBin: 'Main Receiving Dock',
                            notes: `Goods Inward via ${grn.grnNumber} (PO #${po.poNumber})`,
                        });
                        // Master inventory stock update
                        await tx
                            .update(schema_1.inventoryItems)
                            .set({
                            currentStock: newBalance.toFixed(4),
                            costPrice: unitCostNum.toFixed(4), // Update latest purchase cost
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, inv.id));
                    }
                }
            }
            // 4. Update PO fulfillment status
            const updatedPoStatus = allLinesFullyReceived ? 'COMPLETED' : 'PARTIALLY_RECEIVED';
            await tx
                .update(schema_1.purchaseOrders)
                .set({ status: updatedPoStatus, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.purchaseOrders.id, po.id));
            return grn;
        });
        res.status(201).json({ status: 'success', data: result, message: 'Goods received and inventory credited' });
    }
    catch (error) {
        console.error('[Process Goods Receiving Error]:', error);
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.processGoodsReceiving = processGoodsReceiving;
