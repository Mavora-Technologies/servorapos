import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as reportsRepo from '../repositories/reports.repository';
import {
  generateReportSchema,
  createReportScheduleSchema,
  listExecutionsQuerySchema,
} from '../validators/reports.validator';

export const getReportCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const [definitions, telemetry, schedules] = await Promise.all([
      reportsRepo.listReportDefinitions(tenantId),
      reportsRepo.getReportsTelemetry(tenantId),
      reportsRepo.listReportSchedules(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        definitions,
        telemetry,
        schedules,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch reporting catalog' });
  }
};

export const postRunReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = generateReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await reportsRepo.executeReportGeneration(tenantId, userId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `Report ${result.definition.name} generated (${result.rows.length} records processed).`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Report execution failed' });
  }
};

export const getExecutions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listExecutionsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await reportsRepo.listReportExecutions(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: result.executions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list executions' });
  }
};

export const postSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createReportScheduleSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await reportsRepo.createReportSchedule(tenantId, userId, parseResult.data);

    res.status(201).json({
      status: 'success',
      data: created,
      message: 'Automated report distribution schedule created.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create schedule' });
  }
};

export const deleteSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const scheduleId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(scheduleId)) {
      res.status(400).json({ status: 'error', message: 'Valid schedule ID required' });
      return;
    }

    await reportsRepo.deleteReportSchedule(tenantId, scheduleId);
    res.status(200).json({ status: 'success', message: 'Report schedule removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete schedule' });
  }
};