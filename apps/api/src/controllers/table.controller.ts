import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as tableService from '../services/table.service';

export const getFloorPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = await tableService.fetchFloorPlan(req.user!.tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to fetch floor plan' });
  }
};

export const createArea = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const area = await tableService.addArea(req.user!.tenantId, req.body.name);
    res.status(201).json({ status: 'success', data: area });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create area' });
  }
};

export const createTable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const table = await tableService.addTable(req.user!.tenantId, req.body);
    res.status(201).json({ status: 'success', data: table });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to create table' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string; // Explicitly assert as string
    
    const table = await tableService.changeTableStatus(req.user!.tenantId, parseInt(id, 10), req.body.status);
    res.status(200).json({ status: 'success', data: table });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to update table status' });
  }
};