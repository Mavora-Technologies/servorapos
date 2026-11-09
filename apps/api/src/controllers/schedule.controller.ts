import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as scheduleRepo from '../repositories/schedule.repository';
import {
  createScheduleSchema,
  updateScheduleSchema,
  publishWeekSchema,
  copyWeekSchema,
  createTemplateSchema,
} from '../validators/schedule.validator';

export const getRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { weekStart, branchId, role } = req.query;

    const weekStartStr = typeof weekStart === 'string' ? weekStart : undefined;
    if (!weekStartStr) {
      res.status(400).json({ status: 'error', message: 'weekStart (YYYY-MM-DD) query parameter is required' });
      return;
    }

    const startDate = new Date(weekStartStr);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split('T')[0];

    const branchIdStr = typeof branchId === 'string' ? branchId : undefined;
    const branchIdNum = branchIdStr && branchIdStr !== 'ALL' ? parseInt(branchIdStr, 10) : undefined;
    const roleStr = typeof role === 'string' ? role : undefined;

    const data = await scheduleRepo.getWeeklyRoster(tenantId, {
      weekStart: weekStartStr,
      weekEnd,
      branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
      role: roleStr,
    });

    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve roster' });
  }
};

export const createShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createScheduleSchema.parse(req.body);
    const shift = await scheduleRepo.createScheduleEntry(tenantId, input);

    res.status(201).json({ status: 'success', data: shift, message: 'Shift allocated successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to allocate shift' });
  }
};

export const updateShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    // Coerce req.params.id to string to satisfy parseInt(string, radix)
    const scheduleId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(scheduleId)) {
      res.status(400).json({ status: 'error', message: 'Invalid request parameters' });
      return;
    }

    const input = updateScheduleSchema.parse(req.body);
    const updated = await scheduleRepo.updateScheduleEntry(tenantId, scheduleId, input);

    res.status(200).json({ status: 'success', data: updated, message: 'Shift updated successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update shift' });
  }
};

export const deleteShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    // Coerce req.params.id to string to satisfy parseInt(string, radix)
    const scheduleId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(scheduleId)) {
      res.status(400).json({ status: 'error', message: 'Invalid shift identifier' });
      return;
    }

    await scheduleRepo.deleteScheduleEntry(tenantId, scheduleId);
    res.status(200).json({ status: 'success', message: 'Shift deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete shift' });
  }
};

export const publishWeekRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = publishWeekSchema.parse(req.body);
    const result = await scheduleRepo.publishWeek(tenantId, input.weekStart, input.branchId);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.publishedCount} draft shift(s) officially published.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to publish roster' });
  }
};

export const copyWeekRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = copyWeekSchema.parse(req.body);
    const result = await scheduleRepo.copyWeekRoster(
      tenantId,
      input.fromWeekStart,
      input.toWeekStart,
      input.branchId
    );

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.copiedCount} shift(s) replicated to the target week.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to copy schedule' });
  }
};

export const createPreset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = createTemplateSchema.parse(req.body);
    const preset = await scheduleRepo.createShiftPreset(tenantId, input);

    res.status(201).json({ status: 'success', data: preset, message: 'Shift pattern created' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create shift template' });
  }
};