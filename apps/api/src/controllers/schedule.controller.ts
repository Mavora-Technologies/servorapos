// apps/api/src/controllers/schedule.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as scheduleService from '../services/schedule.service';
import {
  getRosterQuerySchema,
  createScheduleSchema,
  updateScheduleSchema,
  publishWeekSchema,
  copyWeekSchema,
  createTemplateSchema,
} from '../validators/schedule.validator';

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

export const getRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = getRosterQuerySchema.parse(req.query);
    const data = await scheduleService.fetchWeeklyRoster(actor, query);

    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid roster query parameters',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve roster';
    res.status(400).json({ status: 'error', message });
  }
};

export const createShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createScheduleSchema.parse(req.body);
    const shift = await scheduleService.allocateShift(actor, input);

    res.status(201).json({
      status: 'success',
      data: shift,
      message: 'Shift allocated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to allocate shift';
    res.status(400).json({ status: 'error', message });
  }
};

export const updateShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const scheduleId = Number(req.params.id);
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid shift identifier' });
      return;
    }

    const input = updateScheduleSchema.parse(req.body);
    const updated = await scheduleService.modifyShift(actor, scheduleId, input);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Shift schedule entry not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Shift updated successfully.',
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
    const message = error instanceof Error ? error.message : 'Failed to update shift';
    res.status(400).json({ status: 'error', message });
  }
};

export const deleteShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const scheduleId = Number(req.params.id);
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid shift identifier' });
      return;
    }

    const deleted = await scheduleService.removeShift(actor, scheduleId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Shift entry not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Shift deleted successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete shift';
    res.status(400).json({ status: 'error', message });
  }
};

export const publishWeekRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = publishWeekSchema.parse(req.body);
    const result = await scheduleService.publishWeeklyRoster(actor, input);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.publishedCount} draft shift(s) officially published.`,
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
    const message = error instanceof Error ? error.message : 'Failed to publish roster';
    res.status(400).json({ status: 'error', message });
  }
};

export const copyWeekRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = copyWeekSchema.parse(req.body);
    const result = await scheduleService.replicateWeeklyRoster(actor, input);

    const suffix =
      result.skippedConflicts > 0
        ? ` (${result.skippedConflicts} conflicting shift(s) skipped)`
        : '';

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.copiedCount} shift(s) replicated to target week${suffix}.`,
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
    const message = error instanceof Error ? error.message : 'Failed to copy schedule';
    res.status(400).json({ status: 'error', message });
  }
};

export const createPreset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createTemplateSchema.parse(req.body);
    const preset = await scheduleService.provisionShiftTemplate(actor, input);

    res.status(201).json({
      status: 'success',
      data: preset,
      message: `Shift pattern "${preset.name}" created.`,
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
    const message = error instanceof Error ? error.message : 'Failed to create shift template';
    res.status(400).json({ status: 'error', message });
  }
};