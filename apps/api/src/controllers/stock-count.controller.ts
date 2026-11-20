// apps/api/src/controllers/stock-count.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as stockCountService from '../services/stock-count.service';
import {
  initiateStockCountSchema,
  updateCountLineSchema,
  reconcileStockCountSchema,
} from '../validators/stock-count.validator';

export const getStockCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const counts = await stockCountService.listTenantStockCounts(tenantId);
    res.status(200).json({ status: 'success', data: counts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stock counts';
    res.status(500).json({ status: 'error', message });
  }
};

export const getStockCountDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const countId = Number(req.params.id);
    if (!Number.isInteger(countId) || countId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid stock count ID' });
      return;
    }

    const details = await stockCountService.fetchStockCountSheet(tenantId, countId);
    if (!details) {
      res.status(404).json({ status: 'error', message: 'Stock count not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: details });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit sheet';
    res.status(500).json({ status: 'error', message });
  }
};

export const initiateStockCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = initiateStockCountSchema.parse(req.body);
    const branchId = req.user?.defaultBranchId ?? null;
    const userId = req.user?.userId ?? null;

    const result = await stockCountService.startStockCountSession(
      tenantId,
      branchId,
      userId,
      payload
    );

    res.status(201).json({ status: 'success', data: result });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to initiate stock count';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateStockCountLine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const lineId = Number(req.params.itemId);
    if (!Number.isInteger(lineId) || lineId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid count line ID' });
      return;
    }

    const payload = updateCountLineSchema.parse(req.body);
    const updated = await stockCountService.recordPhysicalCountLine(tenantId, lineId, payload);

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Count line not found' });
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
    const message = error instanceof Error ? error.message : 'Failed to update count line';
    res.status(400).json({ status: 'error', message });
  }
};

export const reconcileStockCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const countId = Number(req.params.id);
    if (!Number.isInteger(countId) || countId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid stock count ID' });
      return;
    }

    const payload = reconcileStockCountSchema.parse(req.body);
    const branchId = req.user?.defaultBranchId ?? null;
    const userId = req.user?.userId ?? null;

    const result = await stockCountService.finalizeStockCountReconciliation(
      tenantId,
      branchId,
      userId,
      countId,
      payload
    );

    res.status(200).json({
      status: 'success',
      message: `Stocktake ${result.countNumber} reconciled. Inventory variances posted to the material ledger.`,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to reconcile stock count';
    res.status(400).json({ status: 'error', message });
  }
};