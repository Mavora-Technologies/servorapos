import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as attendanceRepo from '../repositories/attendance.repository';
import {
  clockInSchema,
  clockOutSchema,
  manualAdjustmentSchema,
  approveAttendanceSchema,
} from '../validators/attendance.validator';

export const getAttendanceList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { startDate, endDate, branchId, userId, status } = req.query;

    const records = await attendanceRepo.listAttendanceRecords(tenantId, {
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      branchId: typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined,
      userId: typeof userId === 'string' && userId !== 'ALL' ? parseInt(userId, 10) : undefined,
      status: typeof status === 'string' ? status : undefined,
    });

    res.status(200).json({ status: 'success', data: records });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch attendance records' });
  }
};

export const getLiveDuty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const { branchId } = req.query;
    const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;

    const roster = await attendanceRepo.getLiveDutyRoster(tenantId, branchIdNum);
    res.status(200).json({ status: 'success', data: roster });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch live duty roster' });
  }
};

export const handleClockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = clockInSchema.parse(req.body);
    const session = await attendanceRepo.clockIn(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: session,
      message: 'Clock-in recorded. Status set to On Duty.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Clock-in failed' });
  }
};

export const handleClockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = clockOutSchema.parse(req.body);
    const record = await attendanceRepo.clockOut(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: record,
      message: 'Clock-out recorded. Timesheet entry completed.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Clock-out failed' });
  }
};

export const handleManualAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const managerUserId = req.user?.userId;

    if (!tenantId || !managerUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = manualAdjustmentSchema.parse(req.body);
    const record = await attendanceRepo.createManualAdjustment(tenantId, managerUserId, input);

    res.status(201).json({
      status: 'success',
      data: record,
      message: 'Manual time-card entry recorded with manager audit authorization.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to submit manual adjustment' });
  }
};

export const handleBatchApprove = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const managerUserId = req.user?.userId;

    if (!tenantId || !managerUserId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = approveAttendanceSchema.parse(req.body);
    const result = await attendanceRepo.batchApproveAttendance(tenantId, managerUserId, input.recordIds);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `${result.approvedCount} timesheet record(s) approved for payroll consolidation.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to approve attendance records' });
  }
};