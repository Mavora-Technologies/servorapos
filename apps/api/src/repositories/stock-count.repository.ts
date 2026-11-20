// apps/api/src/repositories/stock-count.repository.ts
import { eq, desc, and, asc } from 'drizzle-orm';
import { db } from '../config/db';
import {
  stockCounts,
  stockCountItems,
  inventoryItems,
  stockMovements,
  users,
} from '../config/schema';
import type {
  InitiateStockCountInput,
  UpdateCountLineInput,
  ReconcileStockCountInput,
} from '../validators/stock-count.validator';

export const findStockCountsByTenant = async (tenantId: number) => {
  return await db
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
    .leftJoin(
      users,
      and(eq(stockCounts.conductorId, users.id), eq(users.tenantId, tenantId))
    )
    .where(eq(stockCounts.tenantId, tenantId))
    .orderBy(desc(stockCounts.createdAt));
};

export const findStockCountDetailsById = async (tenantId: number, countId: number) => {
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
    .leftJoin(
      users,
      and(eq(stockCounts.conductorId, users.id), eq(users.tenantId, tenantId))
    )
    .where(and(eq(stockCounts.id, countId), eq(stockCounts.tenantId, tenantId)))
    .limit(1);

  if (!header) return null;

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
    .innerJoin(
      inventoryItems,
      and(
        eq(stockCountItems.inventoryItemId, inventoryItems.id),
        eq(inventoryItems.tenantId, tenantId)
      )
    )
    .where(eq(stockCountItems.stockCountId, header.id))
    .orderBy(asc(inventoryItems.name));

  return { ...header, items };
};

export const createStockCountSessionTransaction = async (
  tenantId: number,
  branchId: number | null,
  userId: number | null,
  payload: InitiateStockCountInput
) => {
  return await db.transaction(async (tx) => {
    const scopeConditions =
      payload.countType === 'CYCLE' && payload.category
        ? and(
            eq(inventoryItems.tenantId, tenantId),
            eq(inventoryItems.isActive, true),
            eq(inventoryItems.category, payload.category)
          )
        : and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.isActive, true));

    const snapshotItems = await tx
      .select({
        id: inventoryItems.id,
        currentStock: inventoryItems.currentStock,
        costPrice: inventoryItems.costPrice,
      })
      .from(inventoryItems)
      .where(scopeConditions)
      .orderBy(asc(inventoryItems.name));

    if (snapshotItems.length === 0) {
      throw new Error('No active inventory articles found for the selected audit scope.');
    }

    const suffix = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 89)}`;
    const countNumber = `PI-${new Date().getFullYear()}-${suffix}`;

    const [countHeader] = await tx
      .insert(stockCounts)
      .values({
        tenantId,
        branchId,
        countNumber,
        status: 'IN_PROGRESS',
        countType: payload.countType,
        category: payload.countType === 'CYCLE' ? payload.category ?? null : null,
        isBlindCount: payload.isBlindCount,
        totalItemsCount: snapshotItems.length,
        discrepancyItemsCount: 0,
        netVarianceCost: '0.0000',
        conductorId: userId,
        notes: payload.notes ?? null,
      })
      .returning();

    await tx.insert(stockCountItems).values(
      snapshotItems.map((it) => ({
        stockCountId: countHeader.id,
        inventoryItemId: it.id,
        expectedQuantity: it.currentStock,
        countedQuantity: null,
        varianceQuantity: null,
        unitCost: it.costPrice,
        varianceCost: null,
        recountRequired: false,
      }))
    );

    return countHeader;
  });
};

export const updateStockCountLineTransaction = async (
  tenantId: number,
  lineId: number,
  payload: UpdateCountLineInput
) => {
  return await db.transaction(async (tx) => {
    const [line] = await tx
      .select({
        id: stockCountItems.id,
        expectedQuantity: stockCountItems.expectedQuantity,
        unitCost: stockCountItems.unitCost,
        stockCountId: stockCountItems.stockCountId,
        parentStatus: stockCounts.status,
      })
      .from(stockCountItems)
      .innerJoin(stockCounts, eq(stockCountItems.stockCountId, stockCounts.id))
      .where(and(eq(stockCountItems.id, lineId), eq(stockCounts.tenantId, tenantId)))
      .limit(1);

    if (!line) {
      return null;
    }

    if (line.parentStatus === 'RECONCILED' || line.parentStatus === 'CANCELLED') {
      throw new Error(
        `Cannot modify line item: audit session is already ${line.parentStatus}.`
      );
    }

    const expected = parseFloat(line.expectedQuantity) || 0;
    const counted = payload.countedQuantity;
    const varianceQty = counted - expected;
    const unitCost = parseFloat(line.unitCost) || 0;
    const varianceCost = varianceQty * unitCost;

    // Tolerance rule: variance > KES 1,500 or > 15% of expected quantity
    const isLargeCostDiscrepancy = Math.abs(varianceCost) > 1500;
    const isLargePercentDiscrepancy = expected > 0 && Math.abs(varianceQty / expected) > 0.15;
    const recountRequired = isLargeCostDiscrepancy || isLargePercentDiscrepancy;

    const [updated] = await tx
      .update(stockCountItems)
      .set({
        countedQuantity: counted.toFixed(4),
        varianceQuantity: varianceQty.toFixed(4),
        varianceCost: varianceCost.toFixed(4),
        recountRequired,
        notes: payload.notes ?? null,
      })
      .where(eq(stockCountItems.id, line.id))
      .returning();

    return updated;
  });
};

export const reconcileStockCountTransaction = async (
  tenantId: number,
  branchId: number | null,
  userId: number | null,
  countId: number,
  payload: ReconcileStockCountInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Lock header row to prevent concurrent double reconciliation
    const lockedHeaders = await tx
      .select()
      .from(stockCounts)
      .where(and(eq(stockCounts.id, countId), eq(stockCounts.tenantId, tenantId)))
      .for('update');

    const header = lockedHeaders[0];
    if (!header) {
      throw new Error('Stock count session not found.');
    }
    if (header.status === 'RECONCILED') {
      throw new Error('This audit session has already been reconciled.');
    }
    if (header.status === 'CANCELLED') {
      throw new Error('Cannot reconcile a cancelled audit session.');
    }

    const lines = await tx
      .select()
      .from(stockCountItems)
      .where(eq(stockCountItems.stockCountId, header.id));

    if (lines.length === 0) {
      throw new Error('Audit session contains no line items.');
    }

    let netVarianceCost = 0;
    let discrepancyCount = 0;

    for (const line of lines) {
      if (line.countedQuantity === null) {
        throw new Error(
          'All listed inventory items must have a physical count before reconciliation.'
        );
      }

      const countedQty = parseFloat(line.countedQuantity) || 0;

      // 2. Lock tenant-scoped inventory item row for atomic balance reconciliation
      const lockedInvRows = await tx
        .select()
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, line.inventoryItemId),
            eq(inventoryItems.tenantId, tenantId)
          )
        )
        .for('update');

      const invItem = lockedInvRows[0];
      if (!invItem) {
        continue;
      }

      const liveStock = parseFloat(invItem.currentStock) || 0;
      const authoritativeUnitCost = parseFloat(invItem.costPrice) || 0;
      const adjustmentDelta = countedQty - liveStock;
      const lineVarianceCost = adjustmentDelta * authoritativeUnitCost;

      netVarianceCost += lineVarianceCost;

      if (Math.abs(adjustmentDelta) > 0.00001) {
        discrepancyCount++;

        // Post compensating double-entry movement matching liveStock + delta = countedQty
        await tx.insert(stockMovements).values({
          tenantId,
          branchId: header.branchId ?? branchId,
          inventoryItemId: invItem.id,
          userId,
          type: 'PHYSICAL_INVENTORY_ADJ',
          quantity: adjustmentDelta.toFixed(4),
          unitCost: authoritativeUnitCost.toFixed(4),
          totalValuation: (Math.abs(adjustmentDelta) * authoritativeUnitCost).toFixed(4),
          balanceAfter: countedQty.toFixed(4),
          documentReference: header.countNumber,
          locationBin: 'Physical Audit Reconciliation',
          notes: `Stocktake ${header.countNumber} variance adjustment`,
        });

        await tx
          .update(inventoryItems)
          .set({
            currentStock: countedQty.toFixed(4),
            updatedAt: new Date(),
          })
          .where(
            and(eq(inventoryItems.id, invItem.id), eq(inventoryItems.tenantId, tenantId))
          );

        // Keep count line variance aligned with final reconciled delta
        await tx
          .update(stockCountItems)
          .set({
            varianceQuantity: adjustmentDelta.toFixed(4),
            unitCost: authoritativeUnitCost.toFixed(4),
            varianceCost: lineVarianceCost.toFixed(4),
          })
          .where(eq(stockCountItems.id, line.id));
      }
    }

    const [reconciled] = await tx
      .update(stockCounts)
      .set({
        status: 'RECONCILED',
        reconciledAt: new Date(),
        approvedById: userId,
        discrepancyItemsCount: discrepancyCount,
        netVarianceCost: netVarianceCost.toFixed(4),
        notes: payload.notes ?? header.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(stockCounts.id, header.id), eq(stockCounts.tenantId, tenantId)))
      .returning();

    return reconciled;
  });
};