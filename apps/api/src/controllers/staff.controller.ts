// apps/api/src/controllers/staff.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as staffService from '../services/staff.service';
import {
  listStaffQuerySchema,
  createStaffSchema,
  updateStaffSchema,
  resetPinSchema,
  toggleStaffStatusSchema,
} from '../validators/staff.validator';

function getActorContext(req: AuthRequest) {
  const user = req.user;
  if (!user?.tenantId || !user?.userId) return null;
  return {
    tenantId: user.tenantId,
    userId: user.userId,
    role: user.role,
    ipAddress: req.ip || null,
  };
}

export const getStaffRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActorContext(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const filters = listStaffQuerySchema.parse(req.query);
    const data = await staffService.getStaffRosterDirectory(actor, filters);

    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid filter parameters',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch staff roster';
    res.status(500).json({ status: 'error', message });
  }
};

export const createStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActorContext(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const payload = createStaffSchema.parse(req.body);
    const newStaff = await staffService.provisionEmployee(actor, payload);

    res.status(201).json({
      status: 'success',
      data: newStaff,
      message: 'Employee successfully provisioned.',
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
    const message = error instanceof Error ? error.message : 'Failed to register employee';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateStaff = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActorContext(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const staffId = Number(req.params.id);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
      return;
    }

    const payload = updateStaffSchema.parse(req.body);
    const updated = await staffService.modifyEmployee(actor, staffId, payload);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Employee record not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Employee profile updated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to update employee';
    res.status(400).json({ status: 'error', message });
  }
};

export const toggleStaffStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActorContext(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const staffId = Number(req.params.id);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
      return;
    }

    const { isActive, reason } = toggleStaffStatusSchema.parse(req.body);
    const updated = await staffService.setEmployeeStatus(actor, staffId, isActive, reason);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Employee record not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Employee account ${isActive ? 'activated' : 'suspended'} successfully.`,
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
    const message = error instanceof Error ? error.message : 'Failed to update status';
    res.status(400).json({ status: 'error', message });
  }
};

export const resetStaffPin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActorContext(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const staffId = Number(req.params.id);
    if (!Number.isInteger(staffId) || staffId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid employee identifier' });
      return;
    }

    const { pin } = resetPinSchema.parse(req.body);
    const result = await staffService.resetEmployeePin(actor, staffId, pin);
    if (!result) {
      res.status(404).json({ status: 'error', message: 'Employee record not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'POS Quick PIN updated successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid PIN format',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to reset PIN';
    res.status(400).json({ status: 'error', message });
  }
};