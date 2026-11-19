// apps/api/src/controllers/inventory.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as inventoryService from '../services/inventory.service';

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const [items, summary] = await Promise.all([
      inventoryService.fetchInventoryItems(tenantId),
      inventoryService.fetchInventorySummary(tenantId),
    ]);
    res.status(200).json({
      status: 'success',
      data: {
        items,
        summary,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory';
    res.status(500).json({ status: 'error', message });
  }
};

export const getStorageLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const locations = await inventoryService.fetchStorageLocations(tenantId);
    res.status(200).json({ status: 'success', data: locations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch storage locations';
    res.status(500).json({ status: 'error', message });
  }
};

export const createInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user?.userId ?? null;
    const branchId = req.user?.defaultBranchId ?? null;

    const newItem = await inventoryService.addInventoryItem(
      tenantId,
      userId,
      branchId,
      req.body
    );
    res.status(201).json({ status: 'success', data: newItem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create inventory item';
    res.status(400).json({ status: 'error', message });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user?.userId ?? null;

    const itemId = Number(req.body.inventoryItemId ?? req.body.itemId);
    const adjustment = Number(req.body.quantityDelta ?? req.body.adjustment);
    const rawLocationId = req.body.locationId;
    const locationId =
      rawLocationId !== undefined && rawLocationId !== null && rawLocationId !== ''
        ? Number(rawLocationId)
        : null;

    const resolvedBranchId =
      req.body.branchId !== undefined && req.body.branchId !== null && req.body.branchId !== ''
        ? Number(req.body.branchId)
        : req.user?.defaultBranchId ?? null;

    const result = await inventoryService.processStockAdjustment(tenantId, {
      itemId,
      branchId: resolvedBranchId,
      userId,
      adjustment,
      type: req.body.type || 'PHYSICAL_INVENTORY_ADJ',
      locationId: locationId && !Number.isNaN(locationId) ? locationId : null,
      locationBin: req.body.locationBin ?? null,
      batchNumber: req.body.batchNumber ?? null,
      documentReference: req.body.documentReference ?? null,
      notes: req.body.notes ?? null,
    });

    res.status(200).json({
      status: 'success',
      message: 'Stock movement posted successfully',
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to post stock movement';
    res.status(400).json({ status: 'error', message });
  }
};