// apps/api/src/controllers/menu.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { createCategorySchema, createMenuItemSchema } from '../validators/menu.validator';
import * as menuService from '../services/menu.service';

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const validatedData = createCategorySchema.parse(req.body);
    const category = await menuService.addCategory(tenantId, validatedData);
    res.status(201).json({ status: 'success', data: category });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

export const createMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const validatedData = createMenuItemSchema.parse(req.body);
    const item = await menuService.addMenuItem(tenantId, validatedData);
    res.status(201).json({ status: 'success', data: item });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

export const getActiveMenu = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const menu = await menuService.fetchActiveMenu(tenantId, branchId);
    res.status(200).json({ status: 'success', data: menu });
  } catch (error: any) {
    console.error('[Menu API Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
  }
};

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const categories = await menuService.fetchCategories(tenantId, branchId);
    res.status(200).json({ status: 'success', data: categories });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch categories' });
  }
};