// apps/api/src/controllers/menu.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
} from '../validators/menu.validator';
import * as menuService from '../services/menu.service';

function getPgErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const errObj = error as { code?: string; cause?: { code?: string } };
    return errObj.code ?? errObj.cause?.code;
  }
  return undefined;
}

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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create category';
    res.status(400).json({ status: 'error', message });
  }
};

export const getMenuCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const catalog = await menuService.fetchMenuCatalog(tenantId, branchId);
    res.status(200).json({ status: 'success', data: catalog });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load menu catalog';
    res.status(500).json({ status: 'error', message });
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
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create menu item';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid menu item ID' });
      return;
    }

    const validatedData = updateMenuItemSchema.parse(req.body);
    const updated = await menuService.modifyMenuItem(tenantId, itemId, validatedData);

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
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
    const message = error instanceof Error ? error.message : 'Failed to update menu item';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid menu item ID' });
      return;
    }

    const deleted = await menuService.removeMenuItem(tenantId, itemId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Menu item not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Menu item deleted successfully' });
  } catch (error: unknown) {
    if (getPgErrorCode(error) === '23503') {
      res.status(409).json({
        status: 'error',
        message:
          'This menu item is referenced by historical POS orders and cannot be deleted. Hide it instead by turning off availability.',
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to delete menu item';
    res.status(500).json({ status: 'error', message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch active menu';
    res.status(500).json({ status: 'error', message });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const categoryId = Number(req.params.id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid category ID' });
      return;
    }

    const validatedData = updateCategorySchema.parse(req.body);
    const updated = await menuService.modifyCategory(tenantId, categoryId, validatedData);

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Category not found' });
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
    const message = error instanceof Error ? error.message : 'Failed to update category';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const categoryId = Number(req.params.id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid category ID' });
      return;
    }

    const deleted = await menuService.removeCategory(tenantId, categoryId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Category not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 409 || getPgErrorCode(error) === '23503') {
      const message =
        error instanceof Error
          ? error.message
          : 'Category still has linked menu items and cannot be deleted.';
      res.status(409).json({ status: 'error', message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to delete category';
    res.status(500).json({ status: 'error', message });
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
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await menuService.fetchCategories(tenantId, branchId, includeInactive);
    res.status(200).json({ status: 'success', data: categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch categories';
    res.status(500).json({ status: 'error', message });
  }
};