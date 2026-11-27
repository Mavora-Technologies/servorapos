// apps/api/src/controllers/combo.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as comboService from '../services/combo.service';
import {
  createComboBundleSchema,
  updateComboBundleSchema,
} from '../validators/combo.validator';

export const getCombos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const rawBranchId = req.query.branchId;
    const branchId =
      typeof rawBranchId === 'string' && rawBranchId !== '' && rawBranchId !== 'ALL'
        ? Number(rawBranchId)
        : undefined;
    const activeOnly = req.query.activeOnly === 'true';

    const combos = await comboService.listTenantCombos(tenantId, {
      branchId: branchId && Number.isInteger(branchId) && branchId > 0 ? branchId : undefined,
      activeOnly,
    });

    res.status(200).json({ status: 'success', data: combos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch combo bundles';
    res.status(500).json({ status: 'error', message });
  }
};

export const createCombo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const validated = createComboBundleSchema.parse(req.body);
    const branchId = req.user?.defaultBranchId ?? null;

    const created = await comboService.registerComboBundle(tenantId, branchId, validated, {
      userId,
      ipAddress: req.ip || null,
    });
    res.status(201).json({ status: 'success', data: created });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create combo bundle';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateCombo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const comboId = Number(req.params.id);
    if (!Number.isInteger(comboId) || comboId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid combo bundle ID' });
      return;
    }

    const validated = updateComboBundleSchema.parse(req.body);
    const updated = await comboService.modifyComboBundle(tenantId, comboId, validated, {
      userId,
      ipAddress: req.ip || null,
    });

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Combo bundle not found' });
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
    const message = error instanceof Error ? error.message : 'Failed to update combo bundle';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteCombo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const comboId = Number(req.params.id);
    if (!Number.isInteger(comboId) || comboId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid combo bundle ID' });
      return;
    }

    const deleted = await comboService.removeComboBundle(tenantId, comboId, {
      userId,
      ipAddress: req.ip || null,
    });
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Combo bundle not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Combo bundle deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete combo bundle';
    res.status(500).json({ status: 'error', message });
  }
};