import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as kitchenService from '../services/kitchen.service';

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const tickets = await kitchenService.fetchActiveTickets(tenantId);
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
    
    await kitchenService.advanceTicketStatus(tenantId, parseInt(id), status);
    res.status(200).json({ status: 'success', message: `Order marked as ${status}` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};