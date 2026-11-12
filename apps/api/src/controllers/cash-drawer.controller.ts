import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as cashDrawerRepo from '../repositories/cash-drawer.repository';
import {
  openDrawerSessionSchema,
  closeDrawerSessionSchema,
  cashDropSchema,
  createCashDrawerSchema,
} from '../validators/cash-drawer.validator';

export const getDrawersDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const data = await cashDrawerRepo.getDrawersDashboardData(Number(tenantId), branchId);

    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    console.error('[Get Drawers Error]:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const openDrawerSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const authUserId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;

    if (!tenantId || !authUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = openDrawerSessionSchema.parse(req.body);
    const result = await cashDrawerRepo.openDrawerSessionRecord(
      Number(tenantId),
      Number(authUserId),
      payload
    );

    res.status(201).json({
      status: 'success',
      message: 'Cash drawer session opened successfully',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const recordCashDrop = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = cashDropSchema.parse(req.body);
    const result = await cashDrawerRepo.recordDrawerCashDrop(Number(tenantId), payload);

    res.status(200).json({ status: 'success', message: 'Cash drop to safe recorded', data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const closeDrawerSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = (req.user as any)?.userId ?? (req.user as any)?.id ?? null;
    const { id } = req.params;

    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = closeDrawerSessionSchema.parse(req.body);
    const result = await cashDrawerRepo.closeDrawerSessionRecord(
      Number(tenantId),
      Number(userId),
      Number(id),
      payload
    );

    res.status(200).json({
      status: 'success',
      message: 'Drawer session closed and reconciled',
      data: result,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};

export const createCashDrawer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createCashDrawerSchema.parse(req.body);
    const rawBranchId = payload.branchId ?? req.user?.defaultBranchId;
    const branchId = rawBranchId ? Number(rawBranchId) : null;

    const newDrawer = await cashDrawerRepo.createCashDrawerRecord(
      Number(tenantId),
      branchId,
      payload
    );

    res.status(201).json({
      status: 'success',
      message: 'POS terminal registered successfully',
      data: newDrawer,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message });
  }
};