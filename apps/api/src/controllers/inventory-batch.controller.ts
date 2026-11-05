import { Response } from 'express';
import { eq, desc, and, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  inventoryBatches,
  inventoryItems,
  suppliers,
  stockMovements,
  branches
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createBatchSchema,
  discardBatchSchema,
  updateBatchStatusSchema
} from '../validators/inventory-batch.validator';

// 1. Get all batches with expiration telemetry and QC status
export const getInventoryBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const batches = await db
      .select({
        id: inventoryBatches.id,
        tenantId: inventoryBatches.tenantId,
        branchId: inventoryBatches.branchId,
        branchName: branches.name,
        inventoryItemId: inventoryBatches.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        itemCategory: inventoryItems.category,
        storageCondition: inventoryItems.storageCondition,
        supplierId: inventoryBatches.supplierId,
        supplierName: suppliers.name,
        batchNumber: inventoryBatches.batchNumber,
        supplierBatchNumber: inventoryBatches.supplierBatchNumber,
        certificateNumber: inventoryBatches.certificateNumber,
        initialQuantity: inventoryBatches.initialQuantity,
        currentQuantity: inventoryBatches.currentQuantity,
        unitCost: inventoryBatches.unitCost,
        locationBin: inventoryBatches.locationBin,
        storageTemperature: inventoryBatches.storageTemperature,
        receivedDate: inventoryBatches.receivedDate,
        expiryDate: inventoryBatches.expiryDate,
        status: inventoryBatches.status,
        notes: inventoryBatches.notes,
        createdAt: inventoryBatches.createdAt,
      })
      .from(inventoryBatches)
      .innerJoin(inventoryItems, eq(inventoryBatches.inventoryItemId, inventoryItems.id))
      .leftJoin(suppliers, eq(inventoryBatches.supplierId, suppliers.id))
      .leftJoin(branches, eq(inventoryBatches.branchId, branches.id))
      .where(eq(inventoryBatches.tenantId, tenantId))
      .orderBy(inventoryBatches.expiryDate);

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
        } else if (daysUntilExpiry <= 0) {
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
  } catch (error: any) {
    console.error('[Get Batches Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch inventory batches' });
  }
};

// 2. Receive and register new stock lot / batch
export const createInventoryBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createBatchSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, payload.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
        .limit(1);

      if (!item) throw new Error('Inventory item not found');

      const costVal = payload.unitCost !== undefined ? payload.unitCost : parseFloat(item.costPrice);
      const qtyNum = payload.initialQuantity;
      const currentBalance = parseFloat(item.currentStock) || 0;
      const newBalance = currentBalance + qtyNum;
      const totalValuation = qtyNum * costVal;

      // 1. Create batch lot record
      const [batch] = await tx
        .insert(inventoryBatches)
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
      await tx.insert(stockMovements).values({
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
        .update(inventoryItems)
        .set({
          currentStock: newBalance.toFixed(4),
          costPrice: costVal.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));

      return batch;
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 3. Update Batch QC Status (Quarantine / Release / Quality Hold)
export const updateBatchQCStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateBatchStatusSchema.parse(req.body);

    const [updated] = await db
      .update(inventoryBatches)
      .set({
        status: payload.status,
        notes: payload.notes || undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(inventoryBatches.id, Number(id)), eq(inventoryBatches.tenantId, tenantId)))
      .returning();

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Batch not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Batch QC status updated', data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Discard Spoilage or Expired Batch
export const discardInventoryBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = discardBatchSchema.parse(req.body);

    await db.transaction(async (tx) => {
      const [batch] = await tx
        .select()
        .from(inventoryBatches)
        .where(and(eq(inventoryBatches.id, Number(id)), eq(inventoryBatches.tenantId, tenantId)))
        .limit(1);

      if (!batch) throw new Error('Batch record not found');

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
        .update(inventoryBatches)
        .set({
          currentQuantity: newBatchQty.toFixed(4),
          status: isDepleted ? 'DISCARDED' : batch.status,
          updatedAt: new Date(),
        })
        .where(eq(inventoryBatches.id, batch.id));

      // 2. Fetch master stock
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, batch.inventoryItemId))
        .limit(1);

      const currentStockNum = parseFloat(item.currentStock) || 0;
      const newBalance = currentStockNum - discardQty;

      // 3. Post compliant WASTE_SCRAP movement
      await tx.insert(stockMovements).values({
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
        .update(inventoryItems)
        .set({
          currentStock: newBalance.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));
    });

    res.status(200).json({ status: 'success', message: 'Batch write-off processed and ledger updated' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};