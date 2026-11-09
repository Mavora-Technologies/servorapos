import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as kitchenRepo from '../repositories/kitchen-settings.repository';
import {
  createKitchenStationSchema,
  updateKitchenStationSchema,
  updateKitchenGlobalSettingsSchema,
} from '../validators/kitchen-settings.validator';

export const getKitchenSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const payload = await kitchenRepo.getKitchenSettingsPayload(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data: payload });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch kitchen settings' });
  }
};

export const postKitchenStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createKitchenStationSchema.parse(req.body);
    const created = await kitchenRepo.createKitchenStation(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'KDS preparation station configured successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register station' });
  }
};

export const putKitchenStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const stationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(stationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid station identifier' });
      return;
    }

    const input = updateKitchenStationSchema.parse(req.body);
    const updated = await kitchenRepo.updateKitchenStation(tenantId, stationId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'KDS station configuration updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update station' });
  }
};

export const deleteKitchenStation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const stationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(stationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid station identifier' });
      return;
    }

    await kitchenRepo.deleteKitchenStation(tenantId, stationId);
    res.status(200).json({ status: 'success', message: 'KDS station removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete station' });
  }
};

export const putGlobalSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = updateKitchenGlobalSettingsSchema.parse(req.body);
    const updated = await kitchenRepo.updateKitchenGlobalSettings(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Global culinary SLA and expediter parameters saved.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update kitchen SLA parameters' });
  }
};