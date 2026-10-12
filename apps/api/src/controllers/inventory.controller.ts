import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as inventoryService from '../services/inventory.service';

export const getInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const items = await inventoryService.fetchInventoryItems(tenantId);
    res.status(200).json({ status: 'success', data: items });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch inventory' });
  }
};

export const createInventoryItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const newItem = await inventoryService.addInventoryItem(tenantId, req.body);
    res.status(201).json({ status: 'success', data: newItem });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create inventory item' });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const { itemId, adjustment, type, notes } = req.body;
    
    await inventoryService.processStockAdjustment(tenantId, {
      itemId,
      adjustment,
      type: type || 'ADJUSTMENT',
      notes,
    });

    res.status(200).json({ status: 'success', message: 'Stock adjusted successfully' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to adjust stock' });
  }
};