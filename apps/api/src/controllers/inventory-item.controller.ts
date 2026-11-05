import { Response } from 'express';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { inventoryItems, suppliers } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createInventoryItemMasterSchema,
  updateInventoryItemMasterSchema,
} from '../validators/inventory-item.validator';

// 1. Fetch Item Master Catalog with Multi-Tab Telemetry
export const getInventoryItemsMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const items = await db
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
      .leftJoin(suppliers, eq(inventoryItems.preferredSupplierId, suppliers.id))
      .where(eq(inventoryItems.tenantId, tenantId))
      .orderBy(desc(inventoryItems.id));

    // Summary calculation
    let totalStockValuation = 0;
    let criticalCount = 0;

    items.forEach((item) => {
      const stock = parseFloat(item.currentStock) || 0;
      const cost = parseFloat(item.costPrice) || 0;
      const min = parseFloat(item.minThreshold) || 0;

      totalStockValuation += stock * cost;
      if (stock <= min && item.isActive) {
        criticalCount++;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalCatalogItems: items.length,
          totalStockValuation: Number(totalStockValuation.toFixed(2)),
          criticalItemsCount: criticalCount,
        },
        items,
      },
    });
  } catch (error: any) {
    console.error('[Get Inventory Items Master Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch inventory catalog' });
  }
};

// 2. Create Master Material Record
export const createInventoryItemMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createInventoryItemMasterSchema.parse(req.body);

    const [item] = await db
      .insert(inventoryItems)
      .values({
        tenantId,
        branchId: branchId || null,
        name: payload.name,
        sku: payload.sku || null,
        barcode: payload.barcode || null,
        materialType: payload.materialType,
        category: payload.category,
        unit: payload.unit,
        purchaseUnit: payload.purchaseUnit || payload.unit,
        conversionFactor: payload.conversionFactor.toFixed(4),
        preferredSupplierId: payload.preferredSupplierId || null,
        costPrice: payload.costPrice.toFixed(4),
        valuationMethod: payload.valuationMethod,
        minThreshold: payload.minThreshold.toFixed(4),
        reorderQuantity: payload.reorderQuantity.toFixed(4),
        currentStock: payload.currentStock.toFixed(4),
        trackingMethod: payload.trackingMethod,
        storageCondition: payload.storageCondition,
        taxClassification: payload.taxClassification,
        allowNegativeStock: payload.allowNegativeStock,
        isActive: payload.isActive,
      })
      .returning();

    res.status(201).json({ status: 'success', data: item });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Update Existing Catalog Record
export const updateInventoryItemMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateInventoryItemMasterSchema.parse(req.body);
    const updateFields: any = { updatedAt: new Date() };

    if (payload.name !== undefined) updateFields.name = payload.name;
    if (payload.sku !== undefined) updateFields.sku = payload.sku;
    if (payload.barcode !== undefined) updateFields.barcode = payload.barcode;
    if (payload.materialType !== undefined) updateFields.materialType = payload.materialType;
    if (payload.category !== undefined) updateFields.category = payload.category;
    if (payload.unit !== undefined) updateFields.unit = payload.unit;
    if (payload.purchaseUnit !== undefined) updateFields.purchaseUnit = payload.purchaseUnit;
    if (payload.conversionFactor !== undefined) updateFields.conversionFactor = payload.conversionFactor.toFixed(4);
    if (payload.preferredSupplierId !== undefined) updateFields.preferredSupplierId = payload.preferredSupplierId;
    if (payload.costPrice !== undefined) updateFields.costPrice = payload.costPrice.toFixed(4);
    if (payload.valuationMethod !== undefined) updateFields.valuationMethod = payload.valuationMethod;
    if (payload.minThreshold !== undefined) updateFields.minThreshold = payload.minThreshold.toFixed(4);
    if (payload.reorderQuantity !== undefined) updateFields.reorderQuantity = payload.reorderQuantity.toFixed(4);
    if (payload.trackingMethod !== undefined) updateFields.trackingMethod = payload.trackingMethod;
    if (payload.storageCondition !== undefined) updateFields.storageCondition = payload.storageCondition;
    if (payload.taxClassification !== undefined) updateFields.taxClassification = payload.taxClassification;
    if (payload.allowNegativeStock !== undefined) updateFields.allowNegativeStock = payload.allowNegativeStock;
    if (payload.isActive !== undefined) updateFields.isActive = payload.isActive;

    const [updated] = await db
      .update(inventoryItems)
      .set(updateFields)
      .where(and(eq(inventoryItems.id, Number(id)), eq(inventoryItems.tenantId, tenantId)))
      .returning();

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 4. Delete Catalog Item
export const deleteInventoryItemMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    await db
      .delete(inventoryItems)
      .where(and(eq(inventoryItems.id, Number(id)), eq(inventoryItems.tenantId, tenantId)));

    res.status(200).json({ status: 'success', message: 'Item deleted from catalog' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};