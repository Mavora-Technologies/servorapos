// apps/api/src/controllers/cashier-assignment.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as assignmentService from '../services/cashier-assignment.service';
import {
  listCashierAssignmentsQuerySchema,
  assignmentContextQuerySchema,
  createCashierAssignmentSchema,
  updateCashierAssignmentSchema,
  revokeAssignmentSchema,
} from '../validators/cashier-assignment.validator';

function getActor(req: AuthRequest) {
  const user = req.user;
  if (!user?.tenantId || !user?.userId) return null;
  return {
    tenantId: user.tenantId,
    userId: user.userId,
    role: user.role,
    ipAddress: req.ip || null,
  };
}

export const getAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listCashierAssignmentsQuerySchema.parse(req.query);
    const records = await assignmentService.fetchAssignments(actor, query);

    res.status(200).json({ status: 'success', data: records });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid filter parameters',
        errors: error.issues,
      });
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to fetch cashier assignments';
    res.status(400).json({ status: 'error', message });
  }
};

export const getContext = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = assignmentContextQuerySchema.parse(req.query);
    const context = await assignmentService.fetchAssignmentContext(actor, query);

    res.status(200).json({ status: 'success', data: context });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve assignment context';
    res.status(400).json({ status: 'error', message });
  }
};

export const postAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createCashierAssignmentSchema.parse(req.body);
    const assignment = await assignmentService.createCustodyAssignment(actor, input);

    res.status(201).json({
      status: 'success',
      data: assignment,
      message: 'Cash drawer custody assigned successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to assign cashier';
    res.status(400).json({ status: 'error', message });
  }
};

export const putAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const assignmentId = Number(req.params.id);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
      return;
    }

    const input = updateCashierAssignmentSchema.parse(req.body);
    const updated = await assignmentService.modifyCustodyAssignment(actor, assignmentId, input);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Cashier assignment not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message:
        input.status === 'ACTIVE'
          ? 'Cashier till activated and shift opened.'
          : input.status === 'RELEASED'
            ? 'Cash drawer custody released.'
            : 'Cashier assignment updated successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update assignment';
    res.status(400).json({ status: 'error', message });
  }
};

export const postRevoke = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const assignmentId = Number(req.params.id);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
      return;
    }

    const { reason } = revokeAssignmentSchema.parse(req.body);
    const revoked = await assignmentService.revokeCustodyAssignment(
      actor,
      assignmentId,
      reason
    );
    if (!revoked) {
      res.status(404).json({ status: 'error', message: 'Cashier assignment not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: revoked,
      message: 'Cash drawer custody revoked and compliance alert dispatched.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Revocation reason is required',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to revoke custody';
    res.status(400).json({ status: 'error', message });
  }
};