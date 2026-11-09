import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as serviceModelRepo from '../repositories/service-model.repository';
import {
  createServiceModelSchema,
  updateServiceModelSchema,
  toggleServiceModelStatusSchema,
} from '../validators/service-model.validator';

export const getServiceModels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const models = await serviceModelRepo.listServiceModels(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data: models });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch service models' });
  }
};

export const postServiceModel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createServiceModelSchema.parse(req.body);
    const created = await serviceModelRepo.createServiceModel(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Service model workflow provisioned successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create service model' });
  }
};

export const putServiceModel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const modelId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(modelId)) {
      res.status(400).json({ status: 'error', message: 'Invalid service model identifier' });
      return;
    }

    const input = updateServiceModelSchema.parse(req.body);
    const updated = await serviceModelRepo.updateServiceModel(tenantId, modelId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Service model configuration updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update service model' });
  }
};

export const patchServiceModelStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const modelId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(modelId)) {
      res.status(400).json({ status: 'error', message: 'Invalid service model identifier' });
      return;
    }

    const { isActive } = toggleServiceModelStatusSchema.parse(req.body);
    const updated = await serviceModelRepo.updateServiceModel(tenantId, modelId, { isActive });

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Service model ${isActive ? 'activated' : 'deactivated'}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to toggle status' });
  }
};

export const deleteServiceModel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const modelId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(modelId)) {
      res.status(400).json({ status: 'error', message: 'Invalid service model identifier' });
      return;
    }

    await serviceModelRepo.deleteServiceModel(tenantId, modelId);
    res.status(200).json({ status: 'success', message: 'Service model removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete service model' });
  }
};