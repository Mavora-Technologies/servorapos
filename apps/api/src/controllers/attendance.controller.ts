// apps/api/src/controllers/attendance.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as attendanceService from '../services/attendance.service';
import {
  listAttendanceQuerySchema,
  liveDutyQuerySchema,
  clockInSchema,
  clockOutSchema,
  manualAdjustmentSchema,
  approveAttendanceSchema,
  rejectAttendanceSchema,
} from '../validators/attendance.validator';

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

export const getAttendanceList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listAttendanceQuerySchema.parse(req.query);
    const records = await attendanceService.fetchAttendanceLedger(actor, query);

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
      error instanceof Error ? error.message : 'Failed to fetch attendance records';
    res.status(400).json({ status: 'error', message });
  }
};

export const getLiveDuty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = liveDutyQuerySchema.parse(req.query);
    const roster = await attendanceService.fetchLiveDutyRoster(actor, query);

    res.status(200).json({ status: 'success', data: roster });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch live duty roster';
    res.status(400).json({ status: 'error', message });
  }
};

export const handleClockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = clockInSchema.parse(req.body);
    const session = await attendanceService.recordClockIn(actor, input);

    res.status(201).json({
      status: 'success',
      data: session,
      message: 'Clock-in recorded. Status set to On Duty.',
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
    const message = error instanceof Error ? error.message : 'Clock-in failed';
    res.status(400).json({ status: 'error', message });
  }
};

export const handleClockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = clockOutSchema.parse(req.body);
    const record = await attendanceService.recordClockOut(actor, input);

    res.status(200).json({
      status: 'success',
      data: record,
      message: 'Clock-out recorded. Timesheet entry completed.',
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
    const message = error instanceof Error ? error.message : 'Clock-out failed';
    res.status(400).json({ status: 'error', message });
  }
};

export const handleManualAdjustment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = manualAdjustmentSchema.parse(req.body);
    const record = await attendanceService.recordManualAdjustment(actor, input);

    res.status(201).json({
      status: 'success',
      data: record,
      message: 'Manual time-card entry recorded with audit trail.',
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
    const message =
      error instanceof Error ? error.message : 'Failed to submit manual adjustment';
    res.status(400).json({ status: 'error', message });
  }
};

export const handleBatchApprove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = approveAttendanceSchema.parse(req.body);
    const result = await attendanceService.approveTimesheets(actor, input.recordIds);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.approvedCount} timesheet record(s) approved for payroll.`,
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
    const message =
      error instanceof Error ? error.message : 'Failed to approve attendance records';
    res.status(400).json({ status: 'error', message });
  }
};

export const handleBatchReject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = getActor(req);
    if (!actor) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = rejectAttendanceSchema.parse(req.body);
    const result = await attendanceService.rejectTimesheets(
      actor,
      input.recordIds,
      input.reason
    );

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.rejectedCount} timesheet record(s) rejected.`,
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
    const message =
      error instanceof Error ? error.message : 'Failed to reject attendance records';
    res.status(400).json({ status: 'error', message });
  }
};