import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createCategorySchema, createMenuItemSchema } from '../validators/menu.validator';
import * as menuService from '../services/menu.service';

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const validatedData = createCategorySchema.parse(req.body);
    const category = await menuService.addCategory(tenantId, validatedData);
    res.status(201).json({ status: 'success', data: category });
  } catch (error: any) {
    if (error.name === 'ZodError') { res.status(400).json({ status: 'error', errors: error.errors }); return; }
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const validatedData = createMenuItemSchema.parse(req.body);
    const item = await menuService.addMenuItem(tenantId, validatedData);
    res.status(201).json({ status: 'success', data: item });
  } catch (error: any) {
    if (error.name === 'ZodError') { res.status(400).json({ status: 'error', errors: error.errors }); return; }
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};

export const getActiveMenu = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const menu = await menuService.fetchActiveMenu(tenantId);
    res.status(200).json({ status: 'success', data: menu });
  } catch (error: any) {
    console.error('[Menu API Error]:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};