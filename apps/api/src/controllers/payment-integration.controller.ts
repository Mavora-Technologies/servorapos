import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as paymentRepo from '../repositories/payment-integration.repository';
import {
  createPaymentIntegrationSchema,
  updatePaymentIntegrationSchema,
  testHandshakeSchema,
} from '../validators/payment-integration.validator';

export const getPaymentIntegrations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const [integrations, logs] = await Promise.all([
      paymentRepo.listPaymentIntegrations(tenantId, branchIdNum),
      paymentRepo.listRecentWebhookLogs(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        integrations,
        logs,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch payment integrations' });
  }
};

export const postPaymentIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createPaymentIntegrationSchema.parse(req.body);
    const created = await paymentRepo.createPaymentIntegration(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Payment gateway integration configured successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create payment integration' });
  }
};

export const putPaymentIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const integrationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(integrationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
      return;
    }

    const input = updatePaymentIntegrationSchema.parse(req.body);
    const updated = await paymentRepo.updatePaymentIntegration(tenantId, integrationId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Payment gateway parameters updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailedMessage = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update payment integration' });
  }
};

export const deletePaymentIntegration = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const integrationId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(integrationId)) {
      res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
      return;
    }

    await paymentRepo.deletePaymentIntegration(tenantId, integrationId);
    res.status(200).json({ status: 'success', message: 'Payment gateway profile removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete payment integration' });
  }
};

export const postTestHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { integrationId } = testHandshakeSchema.parse(req.body);
    const result = await paymentRepo.executeGatewayHandshake(tenantId, integrationId);

    res.status(200).json({
      status: 'success',
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Handshake failed' });
  }
};