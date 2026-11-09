import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as handoverRepo from '../repositories/handover.repository';
import {
  createHandoverSchema,
  updateHandoverSchema,
  acknowledgeHandoverSchema,
} from '../validators/handover.validator';

export const getHandovers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { startDate, endDate, branchId, shiftType, status } = req.query;

    const branchIdStr = typeof branchId === 'string' ? branchId : undefined;
    const branchIdNum = branchIdStr && branchIdStr !== 'ALL' ? parseInt(branchIdStr, 10) : undefined;

    const entries = await handoverRepo.listHandovers(tenantId, {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
      shiftType: typeof shiftType === 'string' ? shiftType : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    res.status(200).json({ status: 'success', data: entries });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve handover logs' });
  }
};

export const getHandoverDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const handoverId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(handoverId)) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const entry = await handoverRepo.findHandoverById(tenantId, handoverId);
    if (!entry) {
      res.status(404).json({ status: 'error', message: 'Handover report not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: entry });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch handover detail' });
  }
};

export const postHandover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const outgoingManagerId = req.user?.userId;

    if (!tenantId || !outgoingManagerId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createHandoverSchema.parse(req.body);
    const handover = await handoverRepo.createHandover(tenantId, outgoingManagerId, input);

    res.status(201).json({
      status: 'success',
      data: handover,
      message: 'Manager shift handover successfully submitted.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to submit handover' });
  }
};

export const putHandover = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const handoverId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(handoverId)) {
      res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
      return;
    }

    const input = updateHandoverSchema.parse(req.body);
    const updated = await handoverRepo.updateHandover(tenantId, handoverId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Shift handover report updated successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update handover' });
  }
};

export const postAcknowledge = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const incomingManagerId = req.user?.userId;
    const handoverId = parseInt(String(req.params.id), 10);

    if (!tenantId || !incomingManagerId || isNaN(handoverId)) {
      res.status(400).json({ status: 'error', message: 'Invalid session or handover identifier' });
      return;
    }

    acknowledgeHandoverSchema.parse(req.body);
    const acknowledged = await handoverRepo.acknowledgeHandover(tenantId, handoverId, incomingManagerId);

    res.status(200).json({
      status: 'success',
      data: acknowledged,
      message: 'Shift handover officially acknowledged and digitally countersigned.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to acknowledge handover' });
  }
};