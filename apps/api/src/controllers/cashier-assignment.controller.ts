import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as assignmentRepo from '../repositories/cashier-assignment.repository';
import {
  createCashierAssignmentSchema,
  updateCashierAssignmentSchema,
  revokeAssignmentSchema,
} from '../validators/cashier-assignment.validator';

export const getAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { startDate, endDate, branchId, status, userId } = req.query;

    const branchIdStr = typeof branchId === 'string' ? branchId : undefined;
    const branchIdNum = branchIdStr && branchIdStr !== 'ALL' ? parseInt(branchIdStr, 10) : undefined;
    const userIdNum = typeof userId === 'string' && userId !== 'ALL' ? parseInt(userId, 10) : undefined;

    const records = await assignmentRepo.listCashierAssignments(tenantId, {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
      userId: userIdNum && !isNaN(userIdNum) ? userIdNum : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    res.status(200).json({ status: 'success', data: records });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch cashier assignments' });
  }
};

export const getContext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const context = await assignmentRepo.getAssignmentContext(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data: context });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve assignment context' });
  }
};

export const postAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const supervisorId = req.user?.userId;

    if (!tenantId || !supervisorId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createCashierAssignmentSchema.parse(req.body);
    const assignment = await assignmentRepo.assignCashier(tenantId, supervisorId, input);

    res.status(201).json({
      status: 'success',
      data: assignment,
      message: 'Cash drawer custody assigned successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to assign cashier' });
  }
};

export const putAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const assignmentId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(assignmentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
      return;
    }

    const input = updateCashierAssignmentSchema.parse(req.body);
    const updated = await assignmentRepo.updateAssignment(tenantId, assignmentId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Cashier assignment updated successfully.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update assignment' });
  }
};

export const postRevoke = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const assignmentId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(assignmentId)) {
      res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
      return;
    }

    const { reason } = revokeAssignmentSchema.parse(req.body);
    const revoked = await assignmentRepo.revokeAssignment(tenantId, assignmentId, reason);

    res.status(200).json({
      status: 'success',
      data: revoked,
      message: 'Cash drawer custody revoked and terminal access restricted.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to revoke custody' });
  }
};