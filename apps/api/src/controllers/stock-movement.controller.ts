import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { stockMovements, inventoryItems, users, branches } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { 
  createManualMovementSchema, 
  reverseMovementSchema 
} from '../validators/stock-movement.validator';

// 1. Get Stock Movements with Enterprise Telemetry
export const getStockMovements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);

    const movements = await db
      .select({
        id: stockMovements.id,
        inventoryItemId: stockMovements.inventoryItemId,
        itemName: inventoryItems.name,
        itemSku: inventoryItems.sku,
        itemUnit: inventoryItems.unit,
        itemCategory: inventoryItems.category,
        orderId: stockMovements.orderId,
        userId: stockMovements.userId,
        userName: users.email,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        unitCost: stockMovements.unitCost,
        totalValuation: stockMovements.totalValuation,
        balanceAfter: stockMovements.balanceAfter,
        batchNumber: stockMovements.batchNumber,
        locationBin: stockMovements.locationBin,
        documentReference: stockMovements.documentReference,
        reversedMovementId: stockMovements.reversedMovementId,
        isReversed: stockMovements.isReversed,
        notes: stockMovements.notes,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(inventoryItems, eq(stockMovements.inventoryItemId, inventoryItems.id))
      .leftJoin(users, eq(stockMovements.userId, users.id))
      .where(eq(stockMovements.tenantId, tenantId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);

    // Calculate audit aggregations
    let totalInflowValuation = 0;
    let totalOutflowValuation = 0;

    movements.forEach((m) => {
      const val = parseFloat(m.totalValuation) || 0;
      const qty = parseFloat(m.quantity) || 0;
      if (qty > 0) {
        totalInflowValuation += val;
      } else {
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
  } catch (error: any) {
    console.error('[Get Stock Movements Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch movements' });
  }
};

// 2. Post Manual Movement (Audit-Safe ACID Transaction)
export const createManualMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createManualMovementSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, payload.inventoryItemId), eq(inventoryItems.tenantId, tenantId)))
        .limit(1);

      if (!item) throw new Error('Inventory item not found');

      const currentStockNum = parseFloat(item.currentStock) || 0;
      const qtyDelta = payload.quantityDelta;
      const newBalance = currentStockNum + qtyDelta;

      if (!item.allowNegativeStock && newBalance < 0) {
        throw new Error(`Insufficient stock for ${item.name}. On hand: ${currentStockNum}, attempting delta: ${qtyDelta}`);
      }

      const costPrice = payload.unitCost !== undefined ? payload.unitCost : parseFloat(item.costPrice) || 0;
      const totalValuation = Math.abs(qtyDelta) * costPrice;

      const [movement] = await tx
        .insert(stockMovements)
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
        .update(inventoryItems)
        .set({
          currentStock: newBalance.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));

      return movement;
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

// 3. Storno Reversal (Compensating Accounting Transaction)
export const reverseStockMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = reverseMovementSchema.parse(req.body);

    const result = await db.transaction(async (tx) => {
      const [origin] = await tx
        .select()
        .from(stockMovements)
        .where(and(eq(stockMovements.id, Number(id)), eq(stockMovements.tenantId, tenantId)))
        .limit(1);

      if (!origin) throw new Error('Original movement record not found');
      if (origin.isReversed) throw new Error('This movement has already been reversed');

      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.id, origin.inventoryItemId))
        .limit(1);

      if (!item) throw new Error('Inventory item no longer exists');

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
        .insert(stockMovements)
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
        .update(stockMovements)
        .set({ isReversed: true })
        .where(eq(stockMovements.id, origin.id));

      // 3. Compensate item balance
      await tx
        .update(inventoryItems)
        .set({
          currentStock: newBalance.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, item.id));

      return reversalMove;
    });

    res.status(200).json({ status: 'success', message: 'Movement reversed successfully', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};