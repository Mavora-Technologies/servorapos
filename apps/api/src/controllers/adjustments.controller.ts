import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as adjustmentsRepo from '../repositories/adjustments.repository';
import {
  listAdjustmentsQuerySchema,
  createAdjustmentSchema,
  reviewAdjustmentSchema,
} from '../validators/adjustments.validator';

export const getAdjustmentsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const metrics = await adjustmentsRepo.getAdjustmentsMetrics(tenantId, branchId);
    res.status(200).json({ status: 'success', data: metrics });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate adjustment metrics' });
  }
};

export const getAdjustments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listAdjustmentsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
      return;
    }

    const data = await adjustmentsRepo.listTenantAdjustments(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list adjustment vouchers' });
  }
};

export const postCreateAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createAdjustmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid adjustment payload', errors: parseResult.error.issues });
      return;
    }

    const created = await adjustmentsRepo.createAdjustmentVoucher(tenantId, userId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Adjustment voucher ${created.adjustmentNumber} submitted for Maker-Checker review.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to submit adjustment voucher' });
  }
};

export const patchReviewAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const supervisorId = req.user?.userId;
    const { id } = req.params;

    if (!tenantId || !supervisorId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const adjustmentId = parseInt(Array.isArray(id) ? id[0] : id, 10);
    const parseResult = reviewAdjustmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid action payload', errors: parseResult.error.issues });
      return;
    }

    const updated = await adjustmentsRepo.reviewAdjustmentVoucher(
      tenantId,
      supervisorId,
      adjustmentId,
      parseResult.data
    );

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Adjustment voucher ${updated.adjustmentNumber} status updated to ${updated.status}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Review action failed' });
  }
};