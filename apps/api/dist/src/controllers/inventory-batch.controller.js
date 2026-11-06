"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discardInventoryBatch = exports.updateBatchQCStatus = exports.createInventoryBatch = exports.getInventoryBatches = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const inventory_batch_validator_1 = require("../validators/inventory-batch.validator");
// 1. Get all batches with expiration telemetry and QC status
const getInventoryBatches = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const batches = await db_1.db
            .select({
            id: schema_1.inventoryBatches.id,
            tenantId: schema_1.inventoryBatches.tenantId,
            branchId: schema_1.inventoryBatches.branchId,
            branchName: schema_1.branches.name,
            inventoryItemId: schema_1.inventoryBatches.inventoryItemId,
            itemName: schema_1.inventoryItems.name,
            itemSku: schema_1.inventoryItems.sku,
            itemUnit: schema_1.inventoryItems.unit,
            itemCategory: schema_1.inventoryItems.category,
            storageCondition: schema_1.inventoryItems.storageCondition,
            supplierId: schema_1.inventoryBatches.supplierId,
            supplierName: schema_1.suppliers.name,
            batchNumber: schema_1.inventoryBatches.batchNumber,
            supplierBatchNumber: schema_1.inventoryBatches.supplierBatchNumber,
            certificateNumber: schema_1.inventoryBatches.certificateNumber,
            initialQuantity: schema_1.inventoryBatches.initialQuantity,
            currentQuantity: schema_1.inventoryBatches.currentQuantity,
            unitCost: schema_1.inventoryBatches.unitCost,
            locationBin: schema_1.inventoryBatches.locationBin,
            storageTemperature: schema_1.inventoryBatches.storageTemperature,
            receivedDate: schema_1.inventoryBatches.receivedDate,
            expiryDate: schema_1.inventoryBatches.expiryDate,
            status: schema_1.inventoryBatches.status,
            notes: schema_1.inventoryBatches.notes,
            createdAt: schema_1.inventoryBatches.createdAt,
        })
            .from(schema_1.inventoryBatches)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.inventoryItemId, schema_1.inventoryItems.id))
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId))
            .orderBy(schema_1.inventoryBatches.expiryDate);
        // Compute live shelf-life metrics
        const now = new Date();
        const evaluated = batches.map((b) => {
            const exp = new Date(b.expiryDate);
            const diffMs = exp.getTime() - now.getTime();
            const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            let computedStatus = b.status;
            if (b.status === 'ACTIVE' || b.status === 'QUARANTINE' || b.status === 'QUALITY_HOLD') {
                if (parseFloat(b.currentQuantity) <= 0) {
                    computedStatus = 'DEPLETED';
                }
                else if (daysUntilExpiry <= 0) {
                    computedStatus = 'EXPIRED';
                }
            }
            return {
                ...b,
                status: computedStatus,
                daysUntilExpiry,
                isNearExpiry: daysUntilExpiry > 0 && daysUntilExpiry <= 7,
            };
        });
        res.status(200).json({ status: 'success', data: evaluated });
    }
    catch (error) {
        console.error('[Get Batches Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch inventory batches' });
    }
};
exports.getInventoryBatches = getInventoryBatches;
// 2. Receive and register new stock lot / batch
const createInventoryBatch = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = inventory_batch_validator_1.createBatchSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const [item] = await tx
                .select()
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, payload.inventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
                .limit(1);
            if (!item)
                throw new Error('Inventory item not found');
            const costVal = payload.unitCost !== undefined ? payload.unitCost : parseFloat(item.costPrice);
            const qtyNum = payload.initialQuantity;
            const currentBalance = parseFloat(item.currentStock) || 0;
            const newBalance = currentBalance + qtyNum;
            const totalValuation = qtyNum * costVal;
            // 1. Create batch lot record
            const [batch] = await tx
                .insert(schema_1.inventoryBatches)
                .values({
                tenantId: Number(tenantId),
                branchId,
                inventoryItemId: payload.inventoryItemId,
                supplierId: payload.supplierId || item.preferredSupplierId || null,
                batchNumber: payload.batchNumber,
                supplierBatchNumber: payload.supplierBatchNumber || null,
                certificateNumber: payload.certificateNumber || null,
                initialQuantity: qtyNum.toFixed(4),
                currentQuantity: qtyNum.toFixed(4),
                unitCost: costVal.toFixed(4),
                locationBin: payload.locationBin?.trim() || 'General Intake Staging',
                storageTemperature: payload.storageTemperature !== undefined && payload.storageTemperature !== null
                    ? payload.storageTemperature.toString()
                    : null,
                receivedDate: payload.receivedDate ? new Date(payload.receivedDate) : new Date(),
                expiryDate: new Date(payload.expiryDate),
                status: payload.status || 'ACTIVE',
                notes: payload.notes || null,
            })
                .returning();
            // 2. Insert audit movement into the enterprise material ledger (Stock Intake)
            await tx.insert(schema_1.stockMovements).values({
                tenantId: Number(tenantId),
                branchId,
                inventoryItemId: payload.inventoryItemId,
                userId: userId ? Number(userId) : null,
                type: 'GOODS_RECEIPT_PO',
                quantity: qtyNum.toFixed(4),
                unitCost: costVal.toFixed(4),
                totalValuation: totalValuation.toFixed(4),
                balanceAfter: newBalance.toFixed(4),
                batchNumber: batch.batchNumber,
                locationBin: batch.locationBin,
                documentReference: `BATCH-${batch.batchNumber}`,
                notes: `Registered lot batch ${batch.batchNumber} (Exp: ${new Date(payload.expiryDate).toLocaleDateString()})`,
            });
            // 3. Update master inventory stock
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: newBalance.toFixed(4),
                costPrice: costVal.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.id));
            return batch;
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
exports.createInventoryBatch = createInventoryBatch;
// 3. Update Batch QC Status (Quarantine / Release / Quality Hold)
const updateBatchQCStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = inventory_batch_validator_1.updateBatchStatusSchema.parse(req.body);
        const [updated] = await db_1.db
            .update(schema_1.inventoryBatches)
            .set({
            status: payload.status,
            notes: payload.notes || undefined,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId)))
            .returning();
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Batch not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Batch QC status updated', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateBatchQCStatus = updateBatchQCStatus;
// 4. Discard Spoilage or Expired Batch
const discardInventoryBatch = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = inventory_batch_validator_1.discardBatchSchema.parse(req.body);
        await db_1.db.transaction(async (tx) => {
            const [batch] = await tx
                .select()
                .from(schema_1.inventoryBatches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.inventoryBatches.tenantId, tenantId)))
                .limit(1);
            if (!batch)
                throw new Error('Batch record not found');
            const batchQty = parseFloat(batch.currentQuantity);
            const discardQty = payload.quantity;
            if (discardQty > batchQty) {
                throw new Error(`Cannot discard more than remaining batch quantity (${batchQty})`);
            }
            const newBatchQty = batchQty - discardQty;
            const isDepleted = newBatchQty <= 0;
            const unitCostNum = parseFloat(batch.unitCost);
            const totalLossValuation = discardQty * unitCostNum;
            // 1. Update batch lot
            await tx
                .update(schema_1.inventoryBatches)
                .set({
                currentQuantity: newBatchQty.toFixed(4),
                status: isDepleted ? 'DISCARDED' : batch.status,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryBatches.id, batch.id));
            // 2. Fetch master stock
            const [item] = await tx
                .select()
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, batch.inventoryItemId))
                .limit(1);
            const currentStockNum = parseFloat(item.currentStock) || 0;
            const newBalance = currentStockNum - discardQty;
            // 3. Post compliant WASTE_SCRAP movement
            await tx.insert(schema_1.stockMovements).values({
                tenantId: Number(tenantId),
                branchId: batch.branchId,
                inventoryItemId: batch.inventoryItemId,
                userId: userId ? Number(userId) : null,
                type: 'WASTE_SCRAP',
                quantity: (-discardQty).toFixed(4),
                unitCost: unitCostNum.toFixed(4),
                totalValuation: totalLossValuation.toFixed(4),
                balanceAfter: newBalance.toFixed(4),
                batchNumber: batch.batchNumber,
                locationBin: batch.locationBin ? `${batch.locationBin} (Disposed)` : 'Spoilage Quarantine Area',
                documentReference: `SCRAP-${batch.batchNumber}`,
                notes: `Discarded from Lot #${batch.batchNumber}: ${payload.reason}`,
            });
            // 4. Update master stock
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: newBalance.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, item.id));
        });
        res.status(200).json({ status: 'success', message: 'Batch write-off processed and ledger updated' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.discardInventoryBatch = discardInventoryBatch;
