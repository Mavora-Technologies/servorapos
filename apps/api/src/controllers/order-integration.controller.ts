import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as orderRepo from '../repositories/order-integration.repository';
import {
  createOrderIntegrationSchema,
  updateOrderIntegrationSchema,
  testSyncSchema,
} from '../validators/order-integration.validator';

export const getOrderIntegrations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const [integrations, logs] = await Promise.all([
      orderRepo.listOrderIntegrations(tenantId, branchIdNum),
      orderRepo.listRecentOrderLogs(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        integrations,
        logs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch order integrations' });
  }
};

export const postOrderIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createOrderIntegrationSchema.parse(req.body);
    const created = await orderRepo.createOrderIntegration(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Third-party order channel integration provisioned successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create order integration' });
  }
};

export const putOrderIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const integrationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(integrationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
      return;
    }

    const input = updateOrderIntegrationSchema.parse(req.body);
    const updated = await orderRepo.updateOrderIntegration(tenantId, integrationId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Order channel configuration updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update order integration' });
  }
};

export const deleteOrderIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const integrationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(integrationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
      return;
    }

    await orderRepo.deleteOrderIntegration(tenantId, integrationId);
    res.status(200).json({ status: 'success', message: 'Order integration profile removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete order integration' });
  }
};

export const postTestSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { integrationId } = testSyncSchema.parse(req.body);
    const result = await orderRepo.executeOrderSyncHandshake(tenantId, integrationId);

    res.status(200).json({
      status: 'success',
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Channel sync failed' });
  }
};