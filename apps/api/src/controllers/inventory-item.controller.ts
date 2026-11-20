// apps/api/src/controllers/inventory-item.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as inventoryItemService from '../services/inventory-item.service';
import {
  createInventoryItemMasterSchema,
  updateInventoryItemMasterSchema,
} from '../validators/inventory-item.validator';

function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const errObj = error as { code?: string; cause?: { code?: string } };
    return errObj.code ?? errObj.cause?.code;
  }
  return undefined;
}

export const getInventoryItemsMaster = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const catalog = await inventoryItemService.fetchInventoryMasterCatalog(tenantId);
    res.status(200).json({ status: 'success', data: catalog });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch inventory catalog';
    res.status(500).json({ status: 'error', message });
  }
};

export const createInventoryItemMaster = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createInventoryItemMasterSchema.parse(req.body);
    const branchId = req.user?.defaultBranchId ?? null;
    const userId = req.user?.userId ?? null;

    const item = await inventoryItemService.registerInventoryMasterItem(
      tenantId,
      branchId,
      userId,
      payload
    );

    res.status(201).json({ status: 'success', data: item });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create inventory item';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateInventoryItemMaster = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid item ID' });
      return;
    }

    const payload = updateInventoryItemMasterSchema.parse(req.body);
    const updated = await inventoryItemService.modifyInventoryMasterItem(
      tenantId,
      itemId,
      payload
    );

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Inventory item not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update inventory item';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteInventoryItemMaster = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid item ID' });
      return;
    }

    const deleted = await inventoryItemService.removeInventoryMasterItem(tenantId, itemId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Inventory item not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Material record deleted from catalog' });
  } catch (error: unknown) {
    // Handle PostgreSQL foreign key constraint violation (23503) gracefully
    if (getPgErrorCode(error) === '23503') {
      res.status(409).json({
        status: 'error',
        message:
          'This material has linked stock movements, recipes, or purchase records and cannot be deleted. Mark it as Inactive instead.',
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Failed to delete inventory item';
    res.status(500).json({ status: 'error', message });
  }
};