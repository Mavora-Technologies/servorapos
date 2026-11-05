import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as kitchenService from '../services/kitchen.service';

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const station = req.query.station as string | undefined;
    const tickets = await kitchenService.fetchActiveTickets(tenantId, station);
    res.status(200).json({ status: 'success', data: tickets });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch tickets' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const { status } = req.body;
    
    await kitchenService.advanceTicketStatus(tenantId, parseInt(id, 10), status);
    res.status(200).json({ status: 'success', message: `Order marked as ${status}` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    // Call through kitchenService instead of kitchenRepo
    const history = await kitchenService.fetchKitchenHistory(tenantId);
    res.status(200).json({ status: 'success', data: history });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen history' });
  }
};

export const getPerformance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const stats = await kitchenService.fetchKitchenPerformance(tenantId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen performance stats' });
  }
};