import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as deliveryService from '../services/delivery.service';

export const getDeliveries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await deliveryService.getDeliveries(req.user!.tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch deliveries' });
  }
};

export const assignDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await deliveryService.dispatchOrder(req.user!.tenantId, parseInt(id, 10), req.body);
    res.status(200).json({ status: 'success', data: order });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to assign driver' });
  }
};

export const markDelivered = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await deliveryService.completeDelivery(req.user!.tenantId, parseInt(id, 10));
    res.status(200).json({ status: 'success', data: order });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to complete delivery' });
  }
};