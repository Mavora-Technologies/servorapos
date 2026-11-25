// apps/api/src/controllers/offline-settings.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as offlineService from '../services/offline-settings.service';
import {
  updateOfflineSettingsSchema,
  syncOfflineBatchSchema,
} from '../validators/offline-settings.validator';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const rawBranch = req.query.branchId;
    const branchIdNum =
      typeof rawBranch === 'string' && rawBranch !== 'ALL' && /^\d+$/.test(rawBranch)
        ? parseInt(rawBranch, 10)
        : undefined;

    const data = await offlineService.fetchOfflineOverview(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch offline settings';
    res.status(500).json({ status: 'error', message });
  }
};

export const putSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = updateOfflineSettingsSchema.parse(req.body);
    const updated = await offlineService.saveOfflineSettings(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Offline survivability and sync policies saved.',
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
    const message = error instanceof Error ? error.message : 'Failed to update offline settings';
    res.status(400).json({ status: 'error', message });
  }
};

export const postSyncOfflineBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = syncOfflineBatchSchema.parse(req.body);
    const result = await offlineService.reconcileOfflineBatch(
      tenantId,
      req.user?.userId ?? null,
      req.user?.defaultBranchId ?? null,
      input
    );

    res.status(200).json({
      status: 'success',
      data: result,
      message: result.alreadyProcessed
        ? `Batch ${result.batch.batchReference} was already reconciled.`
        : `Batch ${result.batch.batchReference} reconciled ${result.batch.recordCount} order(s) with ${result.batch.conflictCount} conflict(s).`,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid offline sync batch payload',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Offline batch reconciliation failed';
    res.status(400).json({ status: 'error', message });
  }
};