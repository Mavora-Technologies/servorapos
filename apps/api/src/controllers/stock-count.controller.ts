import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  stockCounts, 
  stockCountItems, 
  inventoryItems, 
  stockMovements, 
  users, 
  branches 
} from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  initiateStockCountSchema, 
  updateCountLineSchema, 
  reconcileStockCountSchema 
} from '../validators/stock-count.validator';

// 1. Get Stocktake Session Registry
export const getStockCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const counts = await db
      .select({
        id: stockCounts.id,
        countNumber: stockCounts.countNumber,
        status: stockCounts.status,
        countType: stockCounts.countType,
        category: stockCounts.category,
        isBlindCount: stockCounts.isBlindCount,
        totalItemsCount: stockCounts.totalItemsCount,
        discrepancyItemsCount: stockCounts.discrepancyItemsCount,
        netVarianceCost: stockCounts.netVarianceCost,
        conductorEmail: users.email,
        reconciledAt: stockCounts.reconciledAt,
        notes: stockCounts.notes,
        createdAt: stockCounts.createdAt,
      })
      .from(stockCounts)
      .leftJoin(users, eq(stockCounts.conductorId, users.id))
      .where(eq(stockCounts.tenantId, tenantId))
      .orderBy(desc(stockCounts.createdAt));

    res.status(200).json({ status: 'success', data: counts });
  } catch (error: any) {
    console.error('[Get Stock Counts Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 2. Get Single Stocktake Floor Audit Sheet with Lines
export const getStockCountDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const [header] = await db
      .select({
        id: stockCounts.id,
        countNumber: stockCounts.countNumber,
        status: stockCounts.status,
        countType: stockCounts.countType,
        category: stockCounts.category,
        isBlindCount: stockCounts.isBlindCount,
        totalItemsCount: stockCounts.totalItemsCount,
        discrepancyItemsCount: stockCounts.discrepancyItemsCount,
        netVarianceCost: stockCounts.netVarianceCost,
        conductorEmail: users.email,
        reconciledAt: stockCounts.reconciledAt,
        notes: stockCounts.notes,
        createdAt: stockCounts.createdAt,
      })
      .from(stockCounts)
      .leftJoin(users, eq(stockCounts.conductorId, users.id))
      .where(and(eq(stockCounts.id, Number(id)), eq(stockCounts.tenantId, tenantId)))
      .limit(1);

    if (!header) {
      res.status(404).json({ status: 'error', message: 'Stock count not found' });
      return;
    }

    const items = await db
      .select({
        id: stockCountItems.id,
        inventoryItemId: stockCountItems.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        itemCategory: inventoryItems.category,
        expectedQuantity: stockCountItems.expectedQuantity,
        countedQuantity: stockCountItems.countedQuantity,
        varianceQuantity: stockCountItems.varianceQuantity,
        unitCost: stockCountItems.unitCost,
        varianceCost: stockCountItems.varianceCost,
        recountRequired: stockCountItems.recountRequired,
        notes: stockCountItems.notes,
      })
      .from(stockCountItems)
      .innerJoin(inventoryItems, eq(stockCountItems.inventoryItemId, inventoryItems.id))
      .where(eq(stockCountItems.stockCountId, header.id));

    res.status(200).json({ status: 'success', data: { ...header, items } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Initiate Physical Count (Snapshots Live Stock Balances)
export const initiateStockCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = initiateStockCountSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const countNum = `PI-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // Fetch snapshot candidates based on scope
      let itemsQuery = tx
        .select({
          id: inventoryItems.id,
          currentStock: inventoryItems.currentStock,
          costPrice: inventoryItems.costPrice,
        })
        .from(inventoryItems)
        .where(and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.isActive, true)));

      if (payload.countType === 'CYCLE' && payload.category) {
        itemsQuery = tx
          .select({
            id: inventoryItems.id,
            currentStock: inventoryItems.currentStock,
            costPrice: inventoryItems.costPrice,
          })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.tenantId, tenantId),
              eq(inventoryItems.isActive, true),
              eq(inventoryItems.category, payload.category)
            )
          );
      }

      const snapshotItems = await itemsQuery;

      if (snapshotItems.length === 0) {
        throw new Error('No active inventory items found for this audit scope');
      }

      const [countHeader] = await tx
        .insert(stockCounts)
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

      await tx.insert(stockCountItems).values(lineValues);

      return countHeader;
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

// 4. Update Single Audit Line (Calculates Variance & Recount Flag)
export const updateStockCountLine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { itemId } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateCountLineSchema.parse(req.body);

    const [line] = await db
      .select({
        id: stockCountItems.id,
        expectedQuantity: stockCountItems.expectedQuantity,
        unitCost: stockCountItems.unitCost,
        stockCountId: stockCountItems.stockCountId,
      })
      .from(stockCountItems)
      .innerJoin(stockCounts, eq(stockCountItems.stockCountId, stockCounts.id))
      .where(and(eq(stockCountItems.id, Number(itemId)), eq(stockCounts.tenantId, tenantId)))
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

    const [updated] = await db
      .update(stockCountItems)
      .set({
        countedQuantity: counted.toFixed(4),
        varianceQuantity: varianceQty.toFixed(4),
        varianceCost: varianceCost.toFixed(4),
        recountRequired,
        notes: payload.notes || null,
      })
      .where(eq(stockCountItems.id, line.id))
      .returning();

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 5. Reconcile Stocktake (Posts Double-Entry Material Ledgers & Closes Audit)
export const reconcileStockCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rawBranchId = req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = reconcileStockCountSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [header] = await tx
        .select()
        .from(stockCounts)
        .where(and(eq(stockCounts.id, Number(id)), eq(stockCounts.tenantId, tenantId)))
        .limit(1);

      if (!header) throw new Error('Stock count session not found');
      if (header.status === 'RECONCILED') throw new Error('This audit session has already been reconciled');

      const items = await tx
        .select()
        .from(stockCountItems)
        .where(eq(stockCountItems.stockCountId, header.id));

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
            .from(inventoryItems)
            .where(eq(inventoryItems.id, line.inventoryItemId))
            .limit(1);

          if (invItem) {
            const countedQtyNum = parseFloat(line.countedQuantity) || 0;
            const totalValuation = Math.abs(varianceQty) * unitCost;

            // 1. Post compensating physical inventory adjustment ledger
            await tx.insert(stockMovements).values({
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
              .update(inventoryItems)
              .set({
                currentStock: countedQtyNum.toFixed(4),
                updatedAt: new Date(),
              })
              .where(eq(inventoryItems.id, invItem.id));
          }
        }
      }

      // 3. Mark audit session as reconciled
      const [reconciled] = await tx
        .update(stockCounts)
        .set({
          status: 'RECONCILED',
          reconciledAt: new Date(),
          approvedById: userId ? Number(userId) : null,
          discrepancyItemsCount: discrepancyCount,
          netVarianceCost: netVarianceCost.toFixed(4),
          notes: payload.notes || header.notes,
          updatedAt: new Date(),
        })
        .where(eq(stockCounts.id, header.id))
        .returning();

      return reconciled;
    });

    res.status(200).json({
      status: 'success',
      message: `Stocktake ${result.countNumber} reconciled. All inventory variances adjusted in the material ledger.`,
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};