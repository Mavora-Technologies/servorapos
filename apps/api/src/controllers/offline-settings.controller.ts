import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as offlineRepo from '../repositories/offline-settings.repository';
import {
  updateOfflineSettingsSchema,
  simulateSyncBatchSchema,
} from '../validators/offline-settings.validator';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const [settings, batches, telemetry] = await Promise.all([
      offlineRepo.getOrCreateOfflineSettings(tenantId, branchIdNum),
      offlineRepo.listSyncBatches(tenantId),
      offlineRepo.getSyncTelemetry(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        settings,
        batches,
        telemetry,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch offline settings' });
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
    const updated = await offlineRepo.updateOfflineSettings(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Offline survivability and sync configurations saved.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update offline settings' });
  }
};

export const postSimulateSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = simulateSyncBatchSchema.parse(req.body);
    const result = await offlineRepo.triggerSyncSimulation(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `Batch ${result.batchReference} successfully processed and reconciled.`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Sync simulation failed' });
  }
};