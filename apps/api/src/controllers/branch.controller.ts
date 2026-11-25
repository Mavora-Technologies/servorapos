// apps/api/src/controllers/branch.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as branchService from '../services/branch.service';
import { createBranchSchema, updateBranchSchema } from '../validators/branch.validator';

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

export const getBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const records = await branchService.listAuthorizedBranches(actor);
    res.status(200).json({ status: 'success', data: records });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch branches';
    res.status(500).json({ status: 'error', message });
  }
};

export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const payload = createBranchSchema.parse(req.body);
    const branch = await branchService.provisionBranch(actor, payload);

    res.status(201).json({
      status: 'success',
      data: branch,
      message: 'Branch location created successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to create branch';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = Number(req.params.id);
    if (!Number.isInteger(branchId) || branchId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid branch identifier' });
      return;
    }

    const payload = updateBranchSchema.parse(req.body);
    const updated = await branchService.modifyBranch(actor, branchId, payload);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Branch not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Branch profile updated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to update branch';
    res.status(400).json({ status: 'error', message });
  }
};

export const toggleBranchStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = Number(req.params.id);
    if (!Number.isInteger(branchId) || branchId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid branch identifier' });
      return;
    }

    const updated = await branchService.toggleBranchActiveState(actor, branchId);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Branch not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Branch ${updated.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to toggle branch status';
    res.status(400).json({ status: 'error', message });
  }
};