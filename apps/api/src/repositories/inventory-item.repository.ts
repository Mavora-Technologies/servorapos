// apps/api/src/repositories/inventory-item.repository.ts
import { eq, and, desc, ne, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { inventoryItems, stockMovements, suppliers } from '../config/schema';
import type {
  CreateInventoryItemMasterInput,
  UpdateInventoryItemMasterInput,
} from '../validators/inventory-item.validator';

export interface InventoryItemMasterRecord {
  id: number;
  tenantId: number;
  branchId: number | null;
  preferredSupplierId: number | null;
  preferredSupplierName: string | null;
  preferredSupplierLeadTime: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  materialType: string;
  category: string;
  unit: string;
  purchaseUnit: string | null;
  conversionFactor: string;
  currentStock: string;
  minThreshold: string;
  reorderQuantity: string;
  costPrice: string;
  valuationMethod: string;
  trackingMethod: string;
  storageCondition: string;
  taxClassification: string;
  allowNegativeStock: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const findAllMasterItemsByTenant = async (
  tenantId: number
): Promise<InventoryItemMasterRecord[]> => {
  return await db
    .select({
      id: inventoryItems.id,
      tenantId: inventoryItems.tenantId,
      branchId: inventoryItems.branchId,
      preferredSupplierId: inventoryItems.preferredSupplierId,
      preferredSupplierName: suppliers.name,
      preferredSupplierLeadTime: suppliers.leadTimeDays,
      name: inventoryItems.name,
      sku: inventoryItems.sku,
      barcode: inventoryItems.barcode,
      materialType: inventoryItems.materialType,
      category: inventoryItems.category,
      unit: inventoryItems.unit,
      purchaseUnit: inventoryItems.purchaseUnit,
      conversionFactor: inventoryItems.conversionFactor,
      currentStock: inventoryItems.currentStock,
      minThreshold: inventoryItems.minThreshold,
      reorderQuantity: inventoryItems.reorderQuantity,
      costPrice: inventoryItems.costPrice,
      valuationMethod: inventoryItems.valuationMethod,
      trackingMethod: inventoryItems.trackingMethod,
      storageCondition: inventoryItems.storageCondition,
      taxClassification: inventoryItems.taxClassification,
      allowNegativeStock: inventoryItems.allowNegativeStock,
      isActive: inventoryItems.isActive,
      createdAt: inventoryItems.createdAt,
      updatedAt: inventoryItems.updatedAt,
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
    .orderBy(desc(inventoryItems.id));
};

export const getMasterCatalogSummaryByTenant = async (tenantId: number) => {
  const [row] = await db
    .select({
      totalItems: sql<number>`count(*)::int`,
      activeItems: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true)::int`,
      outOfStockCount: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true and ${inventoryItems.currentStock} <= 0)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true and ${inventoryItems.currentStock} > 0 and ${inventoryItems.currentStock} <= ${inventoryItems.minThreshold})::int`,
      criticalItemsCount: sql<number>`count(*) filter (where ${inventoryItems.isActive} = true and ${inventoryItems.currentStock} <= ${inventoryItems.minThreshold})::int`,
      totalBookValuation: sql<string>`coalesce(sum(${inventoryItems.currentStock} * ${inventoryItems.costPrice}), 0)::numeric(14,2)`,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.tenantId, tenantId));

  const valuationNumber = Number(row?.totalBookValuation ?? 0);

  return {
    totalCatalogItems: row?.totalItems ?? 0,
    totalItems: row?.totalItems ?? 0,
    activeItems: row?.activeItems ?? 0,
    lowStockCount: row?.lowStockCount ?? 0,
    outOfStockCount: row?.outOfStockCount ?? 0,
    criticalItemsCount: row?.criticalItemsCount ?? 0,
    totalStockValuation: valuationNumber,
    totalBookValuation: (row?.totalBookValuation ?? '0.00').toString(),
  };
};

export const createMasterItemTransaction = async (
  tenantId: number,
  branchId: number | null,
  userId: number | null,
  payload: CreateInventoryItemMasterInput
) => {
  return await db.transaction(async (tx) => {
    if (payload.preferredSupplierId !== null) {
      const [supplier] = await tx
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, payload.preferredSupplierId),
            eq(suppliers.tenantId, tenantId)
          )
        );
      if (!supplier) {
        throw new Error('Selected supplier does not exist or does not belong to this tenant');
      }
    }

    if (payload.sku) {
      const [dupSku] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(eq(inventoryItems.tenantId, tenantId), eq(inventoryItems.sku, payload.sku))
        );
      if (dupSku) {
        throw new Error(`SKU "${payload.sku}" is already assigned to another material record`);
      }
    }

    if (payload.barcode) {
      const [dupBarcode] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            eq(inventoryItems.barcode, payload.barcode)
          )
        );
      if (dupBarcode) {
        throw new Error(
          `Barcode "${payload.barcode}" is already assigned to another material record`
        );
      }
    }

    const openingQty = payload.currentStock > 0 ? payload.currentStock : 0;

    const [created] = await tx
      .insert(inventoryItems)
      .values({
        tenantId,
        branchId,
        name: payload.name,
        sku: payload.sku ?? null,
        barcode: payload.barcode ?? null,
        materialType: payload.materialType,
        category: payload.category,
        unit: payload.unit,
        purchaseUnit: payload.purchaseUnit ?? payload.unit,
        conversionFactor: payload.conversionFactor.toFixed(4),
        preferredSupplierId: payload.preferredSupplierId,
        costPrice: payload.costPrice.toFixed(4),
        valuationMethod: payload.valuationMethod,
        minThreshold: payload.minThreshold.toFixed(4),
        reorderQuantity: payload.reorderQuantity.toFixed(4),
        currentStock: openingQty.toFixed(4),
        trackingMethod: payload.trackingMethod,
        storageCondition: payload.storageCondition,
        taxClassification: payload.taxClassification,
        allowNegativeStock: payload.allowNegativeStock,
        isActive: payload.isActive,
      })
      .returning();

    if (openingQty > 0) {
      await tx.insert(stockMovements).values({
        tenantId,
        branchId,
        inventoryItemId: created.id,
        userId,
        type: 'PHYSICAL_INVENTORY_ADJ',
        quantity: openingQty.toFixed(4),
        unitCost: payload.costPrice.toFixed(4),
        totalValuation: (openingQty * payload.costPrice).toFixed(4),
        balanceAfter: openingQty.toFixed(4),
        notes: 'Initial opening stock balance on material master creation',
      });
    }

    return created;
  });
};

export const updateMasterItemRecord = async (
  tenantId: number,
  itemId: number,
  payload: UpdateInventoryItemMasterInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.tenantId, tenantId)));

    if (!existing) {
      return null;
    }

    if (payload.preferredSupplierId !== undefined && payload.preferredSupplierId !== null) {
      const [supplier] = await tx
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.id, payload.preferredSupplierId),
            eq(suppliers.tenantId, tenantId)
          )
        );
      if (!supplier) {
        throw new Error('Selected supplier does not exist or does not belong to this tenant');
      }
    }

    if (payload.sku) {
      const [dupSku] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            eq(inventoryItems.sku, payload.sku),
            ne(inventoryItems.id, itemId)
          )
        );
      if (dupSku) {
        throw new Error(`SKU "${payload.sku}" is already assigned to another material record`);
      }
    }

    if (payload.barcode) {
      const [dupBarcode] = await tx
        .select({ id: inventoryItems.id })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            eq(inventoryItems.barcode, payload.barcode),
            ne(inventoryItems.id, itemId)
          )
        );
      if (dupBarcode) {
        throw new Error(
          `Barcode "${payload.barcode}" is already assigned to another material record`
        );
      }
    }

    const updateFields: Partial<typeof inventoryItems.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.sku !== undefined) updateFields.sku = payload.sku;
    if (payload.barcode !== undefined) updateFields.barcode = payload.barcode;
    if (payload.materialType !== undefined) updateFields.materialType = payload.materialType;
    if (payload.category !== undefined) updateFields.category = payload.category;
    if (payload.unit !== undefined) updateFields.unit = payload.unit;
    if (payload.purchaseUnit !== undefined) updateFields.purchaseUnit = payload.purchaseUnit;
    if (payload.conversionFactor !== undefined) {
      updateFields.conversionFactor = payload.conversionFactor.toFixed(4);
    }
    if (payload.preferredSupplierId !== undefined) {
      updateFields.preferredSupplierId = payload.preferredSupplierId;
    }
    if (payload.costPrice !== undefined) updateFields.costPrice = payload.costPrice.toFixed(4);
    if (payload.valuationMethod !== undefined) {
      updateFields.valuationMethod = payload.valuationMethod;
    }
    if (payload.minThreshold !== undefined) {
      updateFields.minThreshold = payload.minThreshold.toFixed(4);
    }
    if (payload.reorderQuantity !== undefined) {
      updateFields.reorderQuantity = payload.reorderQuantity.toFixed(4);
    }
    if (payload.trackingMethod !== undefined) {
      updateFields.trackingMethod = payload.trackingMethod;
    }
    if (payload.storageCondition !== undefined) {
      updateFields.storageCondition = payload.storageCondition;
    }
    if (payload.taxClassification !== undefined) {
      updateFields.taxClassification = payload.taxClassification;
    }
    if (payload.allowNegativeStock !== undefined) {
      updateFields.allowNegativeStock = payload.allowNegativeStock;
    }
    if (payload.isActive !== undefined) updateFields.isActive = payload.isActive;

    const [updated] = await tx
      .update(inventoryItems)
      .set(updateFields)
      .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  });
};

export const deleteMasterItemRecord = async (tenantId: number, itemId: number) => {
  const [deleted] = await db
    .delete(inventoryItems)
    .where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.tenantId, tenantId)))
    .returning({ id: inventoryItems.id });

  return deleted ?? null;
};