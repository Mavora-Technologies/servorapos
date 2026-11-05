import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  wasteLogs, 
  inventoryItems, 
  inventoryBatches,
  stockMovements, 
  users, 
  branches 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createWasteLogSchema } from '../validators/waste-log.validator';

// 1. Get All Waste Records with Enterprise Telemetry & Cost Center Breakdown
export const getWasteLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const logs = await db
      .select({
        id: wasteLogs.id,
        inventoryItemId: wasteLogs.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        itemCategory: inventoryItems.category,
        inventoryBatchId: wasteLogs.inventoryBatchId,
        batchNumber: inventoryBatches.batchNumber,
        branchId: wasteLogs.branchId,
        branchName: branches.name,
        department: wasteLogs.department,
        wasteReason: wasteLogs.wasteReason,
        dispositionMethod: wasteLogs.dispositionMethod,
        locationBin: wasteLogs.locationBin,
        documentReference: wasteLogs.documentReference,
        quantity: wasteLogs.quantity,
        unitCost: wasteLogs.unitCost,
        totalLossCost: wasteLogs.totalLossCost,
        reportedById: wasteLogs.reportedById,
        reporterEmail: users.email,
        notes: wasteLogs.notes,
        loggedAt: wasteLogs.loggedAt,
      })
      .from(wasteLogs)
      .innerJoin(inventoryItems, eq(wasteLogs.inventoryItemId, inventoryItems.id))
      .leftJoin(inventoryBatches, eq(wasteLogs.inventoryBatchId, inventoryBatches.id))
      .leftJoin(users, eq(wasteLogs.reportedById, users.id))
      .leftJoin(branches, eq(wasteLogs.branchId, branches.id))
      .where(eq(wasteLogs.tenantId, tenantId))
      .orderBy(desc(wasteLogs.loggedAt));

    let totalLossValuation = 0;
    const reasonBreakdown: Record<string, { count: number; loss: number }> = {};
    const departmentBreakdown: Record<string, { count: number; loss: number }> = {};

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
  } catch (error: any) {
    console.error('[Get Waste Logs Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch waste records' });
  }
};

// 2. Post Waste Incident with Compliant Material Movement & Batch Depletion
export const createWasteLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createWasteLogSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      // 1. Fetch item master
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, payload.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
        .limit(1);

      if (!item) throw new Error('Inventory item not found');

      const currentStockNum = parseFloat(item.currentStock) || 0;
      const wasteQty = payload.quantity;
      const unitCost = payload.unitCost !== undefined ? payload.unitCost : parseFloat(item.costPrice) || 0;
      const totalLoss = wasteQty * unitCost;
      const newBalance = currentStockNum - wasteQty;

      if (!item.allowNegativeStock && newBalance < 0) {
        throw new Error(
          `Cannot write off ${wasteQty} ${item.unit}. Only ${currentStockNum} ${item.unit} currently on-hand.`
        );
      }

      // Generate Material Document Ref
      const scrapDocNum = `WST-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // 2. If a specific batch/lot was designated, deduct from the batch
      let batchNumberStr: string | null = null;
      if (payload.inventoryBatchId) {
        const [batch] = await tx
          .select()
          .from(inventoryBatches)
          .where(and(eq(inventoryBatches.id, payload.inventoryBatchId), eq(inventoryBatches.tenantId, tenantId)))
          .limit(1);

        if (batch) {
          batchNumberStr = batch.batchNumber;
          const currentBatchQty = parseFloat(batch.currentQuantity) || 0;
          const newBatchQty = Math.max(0, currentBatchQty - wasteQty);

          await tx
            .update(inventoryBatches)
            .set({
              currentQuantity: newBatchQty.toFixed(4),
              status: newBatchQty <= 0 ? 'DISCARDED' : batch.status,
              updatedAt: new Date(),
            })
            .where(eq(inventoryBatches.id, batch.id));
        }
      }

      // 3. Insert into waste_logs
      const [wasteEntry] = await tx
        .insert(wasteLogs)
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
      await tx.insert(stockMovements).values({
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
        .update(inventoryItems)
        .set({
          currentStock: newBalance.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));

      return wasteEntry;
    });

    res.status(201).json({ status: 'success', data: result, message: 'Stock written off and financial loss recorded' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};