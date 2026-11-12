import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as deliveryService from '../services/delivery.service';
import {
  listDeliveriesQuerySchema,
  dispatchDeliverySchema,
} from '../validators/delivery.validator';

export const getDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = listDeliveriesQuerySchema.safeParse(req.query);
    const data = await deliveryService.getDeliveries(
      req.user!.tenantId,
      parsed.success ? parsed.data : undefined
    );
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch deliveries' });
  }
};

export const getFleetRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const staff = await deliveryService.getFleetStaff(req.user!.tenantId);
    res.status(200).json({ status: 'success', data: staff });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to load fleet roster' });
  }
};

export const assignDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid order ID' });
      return;
    }

    const parsed = dispatchDeliverySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: 'error',
        message: parsed.error.issues[0]?.message || 'Invalid dispatch payload',
      });
      return;
    }

    const userId = (req.user as any)?.userId ?? (req.user as any)?.id;
    const order = await deliveryService.dispatchOrder(req.user!.tenantId, userId, id, parsed.data);
    res.status(200).json({ status: 'success', data: order });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to dispatch order' });
  }
};

export const markDelivered = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid order ID' });
      return;
    }

    const userId = (req.user as any)?.userId ?? (req.user as any)?.id;
    const order = await deliveryService.completeDelivery(req.user!.tenantId, userId, id);
    res.status(200).json({ status: 'success', data: order });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to complete delivery' });
  }
};