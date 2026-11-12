import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as cashShiftRepo from '../repositories/cash-shifts.repository';
import {
  openShiftSchema,
  closeShiftSchema,
  shiftCashMovementSchema,
  listShiftsQuerySchema,
} from '../validators/cash-shifts.validator';

export const getShiftSetup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const data = await cashShiftRepo.getShiftCockpitSetup(tenantId, branchId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to load shift setup' });
  }
};

export const getShiftOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const data = await cashShiftRepo.getCashShiftMetrics(tenantId, branchId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate cash metrics' });
  }
};

export const getShifts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listShiftsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query parameters', errors: parseResult.error.issues });
      return;
    }

    const data = await cashShiftRepo.listTenantCashShifts(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list shift records' });
  }
};

export const getMyActiveShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const active = await cashShiftRepo.getActiveShiftForCashier(tenantId, userId);
    res.status(200).json({ status: 'success', data: active });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to check active shift' });
  }
};

export const postOpenShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = openShiftSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid shift parameters', errors: parseResult.error.issues });
      return;
    }

    const shift = await cashShiftRepo.openCashShiftRecord(tenantId, userId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: shift,
      message: `Cashier shift #${shift.id} opened with opening float of KES ${Number(shift.openingFloat).toLocaleString()}`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to open shift' });
  }
};

export const postShiftCashMovement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = shiftCashMovementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid cash movement parameters', errors: parseResult.error.issues });
      return;
    }

    const updated = await cashShiftRepo.recordShiftCashMovement(tenantId, userId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: updated,
      message: `${parseResult.data.movementType === 'SAFE_DROP' ? 'Safe drop' : 'Petty cash payout'} of KES ${parseResult.data.amount.toLocaleString()} recorded.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to record cash movement' });
  }
};

export const postCloseShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const supervisorId = req.user?.userId;
    if (!tenantId || !supervisorId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = closeShiftSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid closing parameters', errors: parseResult.error.issues });
      return;
    }

    const shift = await cashShiftRepo.closeCashShiftRecord(tenantId, supervisorId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: shift,
      message: `Shift #${shift.id} balanced and closed with variance of KES ${Number(shift.variance).toLocaleString()}`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to close shift' });
  }
};