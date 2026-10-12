import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as waitlistService from '../services/waitlist.service';

export const getWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await waitlistService.getWaitlist(req.user!.tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch waitlist' });
  }
};

export const createWaitlistEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const entry = await waitlistService.addToWaitlist(req.user!.tenantId, req.body);
    res.status(201).json({ status: 'success', data: entry });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to add to waitlist' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; // Assert as string to satisfy TypeScript
    const entry = await waitlistService.changeWaitlistStatus(req.user!.tenantId, parseInt(id, 10), req.body.status);
    res.status(200).json({ status: 'success', data: entry });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update waitlist status' });
  }
};