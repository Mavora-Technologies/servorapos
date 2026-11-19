// apps/api/src/repositories/inventory.repository.ts
import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import {
  inventoryItems,
  stockMovements,
  warehouseLocations,
  suppliers,
} from '../config/schema';

export type MaterialType = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD' | 'CONSUMABLE';
export type ValuationMethod = 'FIFO' | 'AVCO' | 'STANDARD';
export type TaxClassification = 'A_16' | 'B_ZERO' | 'E_EXEMPT';
export type MovementType =
  | 'GOODS_RECEIPT_PO'
  | 'POS_RECIPE_DEPLETION'
  | 'PHYSICAL_INVENTORY_ADJ'
  | 'WASTE_SCRAP'
  | 'SUPPLIER_RETURN'
  | 'STORNO_REVERSAL'
  | 'TRANSFER';

export interface CreateInventoryItemRecordInput {
  branchId: number | null;
  userId: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  materialType: MaterialType;
  category: string;
  unit: string;
  purchaseUnit: string | null;
  conversionFactor: string;
  preferredSupplierId: number | null;
  openingStock: number;
  minThreshold: string;
  reorderQuantity: string;
  costPrice: string;
  valuationMethod: ValuationMethod;
  storageCondition: string;
  taxClassification: TaxClassification;
  allowNegativeStock: boolean;
  isActive: boolean;
}

export interface StockMovementRecordInput {
  itemId: number;
  branchId: number | null;
  userId: number | null;
  adjustment: number;
  type: MovementType;
  locationId: number | null;
  locationBin: string | null;
  batchNumber: string | null;
  documentReference: string | null;
  notes: string | null;
}

export const getItemsByTenant = async (tenantId: number) => {
  const rows = await db
    .select({
      item: inventoryItems,
      preferredSupplierName: suppliers.name,
    })
    .from(inventoryItems)
    .leftJoin(
      suppliers,
      and(
        eq(inventoryItems.preferredSupplierId, suppliers.id),
        eq(suppliers.tenantId, tenantId)
      )
    )
    .where(eq(inventoryItems.tenantId, tenantId))
    .orderBy(asc(inventoryItems.name));

  return rows.map(({ item, preferredSupplierName }) => ({
    ...item,
    preferredSupplierName: preferredSupplierName ?? null,
  }));
};

export const getInventorySummaryByTenant = async (tenantId: number) => {
  const [summary] = await db
    .select({
      totalItems: sql<number>`count(*)::int`,
      activeItems: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true)::int`,
      outOfStockCount: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true and ${inventoryItems.currentStock} <= 0)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true and ${inventoryItems.currentStock} > 0 and ${inventoryItems.currentStock} <= ${inventoryItems.minThreshold})::int`,
      totalBookValuation: sql<string>`coalesce(sum(${inventoryItems.currentStock} * ${inventoryItems.costPrice}), 0)::numeric(14,2)`,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.tenantId, tenantId));

  return {
    totalItems: summary?.totalItems ?? 0,
    activeItems: summary?.activeItems ?? 0,
    lowStockCount: summary?.lowStockCount ?? 0,
    outOfStockCount: summary?.outOfStockCount ?? 0,
    totalBookValuation: summary?.totalBookValuation ?? '0.00',
  };
};

export const getStorageLocationsByTenant = async (tenantId: number) => {
  return await db
    .select({
      id: warehouseLocations.id,
      branchId: warehouseLocations.branchId,
      code: warehouseLocations.code,
      name: warehouseLocations.name,
      zoneType: warehouseLocations.zoneType,
      isRefrigerated: warehouseLocations.isRefrigerated,
    })
    .from(warehouseLocations)
    .where(
      and(
        eq(warehouseLocations.tenantId, tenantId),
        eq(warehouseLocations.isActive, true)
      )
    )
    .orderBy(asc(warehouseLocations.code));
};

export const getSuppliersByTenant = async (tenantId: number) => {
  return await db
    .select({
      id: suppliers.id,
      name: suppliers.name,
    })
    .from(suppliers)
    .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.isActive, true)))
    .orderBy(asc(suppliers.name));
};

export const createInventoryItemRecord = async (
  tenantId: number,
  data: CreateInventoryItemRecordInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Validate tenant-scoped supplier FK if provided
    if (data.preferredSupplierId !== null) {
      const [supplier] = await tx
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, data.preferredSupplierId),
            eq(suppliers.tenantId, tenantId)
          )
        );
      if (!supplier) {
        throw new Error('Selected supplier does not belong to this tenant');
      }
    }

    // 2. Enforce tenant-scoped SKU & Barcode uniqueness if provided
    if (data.sku) {
      const [existingSku] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            eq(inventoryItems.sku, data.sku)
          )
        );
      if (existingSku) {
        throw new Error(`SKU "${data.sku}" is already assigned to another inventory article`);
      }
    }

    if (data.barcode) {
      const [existingBarcode] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            eq(inventoryItems.barcode, data.barcode)
          )
        );
      if (existingBarcode) {
        throw new Error(`Barcode "${data.barcode}" is already assigned to another inventory article`);
      }
    }

    const openingQty = data.openingStock > 0 ? data.openingStock : 0;

    // 3. Create master record (starting at 0.0000; opening stock posted via ledger below)
    const [newItem] = await tx
      .insert(inventoryItems)
      .values({
        tenantId,
        branchId: data.branchId,
        name: data.name,
        sku: data.sku,
        barcode: data.barcode,
        materialType: data.materialType,
        category: data.category,
        unit: data.unit,
        purchaseUnit: data.purchaseUnit,
        conversionFactor: data.conversionFactor,
        preferredSupplierId: data.preferredSupplierId,
        currentStock: openingQty.toFixed(4),
        minThreshold: data.minThreshold,
        reorderQuantity: data.reorderQuantity,
        costPrice: data.costPrice,
        valuationMethod: data.valuationMethod,
        storageCondition: data.storageCondition,
        taxClassification: data.taxClassification,
        allowNegativeStock: data.allowNegativeStock,
        isActive: data.isActive,
      })
      .returning();

    // 4. Record auditable opening balance movement if initial stock > 0
    if (openingQty > 0) {
      const unitCostNum = parseFloat(data.costPrice) || 0;
      await tx.insert(stockMovements).values({
        tenantId,
        branchId: data.branchId,
        inventoryItemId: newItem.id,
        userId: data.userId,
        type: 'PHYSICAL_INVENTORY_ADJ',
        quantity: openingQty.toFixed(4),
        unitCost: unitCostNum.toFixed(4),
        totalValuation: (openingQty * unitCostNum).toFixed(4),
        balanceAfter: openingQty.toFixed(4),
        notes: 'Initial opening stock balance on article registration',
      });
    }

    return newItem;
  });
};

export const adjustStockTransaction = async (
  tenantId: number,
  data: StockMovementRecordInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Lock row with FOR UPDATE to prevent concurrent lost-update race conditions
    const lockedRows = await tx
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, data.itemId),
          eq(inventoryItems.tenantId, tenantId)
        )
      )
      .for('update');

    const item = lockedRows[0];
    if (!item) {
      throw new Error('Inventory item not found or access denied');
    }

    // 2. Validate relational storage location belongs to the authenticated tenant
    let resolvedLocationBin: string | null = data.locationBin;
    let resolvedBranchId: number | null = data.branchId ?? item.branchId ?? null;

    if (data.locationId !== null) {
      const [location] = await tx
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.id, data.locationId),
            eq(warehouseLocations.tenantId, tenantId),
            eq(warehouseLocations.isActive, true)
          )
        );
      if (!location) {
        throw new Error('Selected storage location is invalid or belongs to another tenant');
      }
      resolvedLocationBin = `${location.name} (${location.code})`;
      resolvedBranchId = location.branchId;
    }

    const currentStockNum = parseFloat(item.currentStock) || 0;
    const newStock = currentStockNum + data.adjustment;

    if (newStock < 0 && !item.allowNegativeStock) {
      throw new Error(
        `Insufficient stock: current balance is ${currentStockNum.toFixed(2)} ${item.unit}`
      );
    }

    // 3. Use authoritative master unit cost from backend ledger rather than trusting browser cost
    const authoritativeUnitCost = parseFloat(item.costPrice) || 0;
    const totalValuationNum = Math.abs(data.adjustment) * authoritativeUnitCost;

    const [updatedItem] = await tx
      .update(inventoryItems)
      .set({
        currentStock: newStock.toFixed(4),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, data.itemId),
          eq(inventoryItems.tenantId, tenantId)
        )
      )
      .returning();

    const [movement] = await tx
      .insert(stockMovements)
      .values({
        tenantId,
        branchId: resolvedBranchId,
        inventoryItemId: data.itemId,
        userId: data.userId,
        type: data.type,
        quantity: data.adjustment.toFixed(4),
        unitCost: authoritativeUnitCost.toFixed(4),
        totalValuation: totalValuationNum.toFixed(4),
        balanceAfter: newStock.toFixed(4),
        batchNumber: data.batchNumber,
        locationBin: resolvedLocationBin,
        documentReference: data.documentReference,
        notes: data.notes,
      })
      .returning();

    return { item: updatedItem, movement };
  });
};