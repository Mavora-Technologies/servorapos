import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as savedReportsRepo from '../repositories/saved-reports.repository';
import * as reportsRepo from '../repositories/reports.repository';
import {
  listSavedReportsQuerySchema,
  updateSavedReportSchema,
} from '../validators/saved-reports.validator';

export const getSavedReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listSavedReportsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await savedReportsRepo.listTenantSavedReports(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: result.reports,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list saved reports' });
  }
};

export const getSavedReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const reportId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(reportId)) {
      res.status(400).json({ status: 'error', message: 'Valid report identifier required' });
      return;
    }

    const report = await savedReportsRepo.getSavedReportDetail(tenantId, reportId);
    if (!report) {
      res.status(404).json({ status: 'error', message: 'Saved report not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: report });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch saved report' });
  }
};

export const patchSavedReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const reportId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(reportId)) {
      res.status(400).json({ status: 'error', message: 'Valid report identifier required' });
      return;
    }

    const parseResult = updateSavedReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await savedReportsRepo.updateSavedReport(tenantId, reportId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Saved report not found or cannot be edited' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Report "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update saved report' });
  }
};

export const deleteSavedReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const reportId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(reportId)) {
      res.status(400).json({ status: 'error', message: 'Valid report identifier required' });
      return;
    }

    const deleted = await savedReportsRepo.deleteSavedReport(tenantId, reportId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Saved report not found or already deleted' });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: `Saved report "${deleted.name}" has been deleted.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete saved report' });
  }
};

export const runSavedReportDirectly = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    const reportId = parseInt(String(req.params.id), 10);

    if (!tenantId || !userId || isNaN(reportId)) {
      res.status(400).json({ status: 'error', message: 'Valid session and report identifier required' });
      return;
    }

    const definition = await savedReportsRepo.getSavedReportDetail(tenantId, reportId);
    if (!definition) {
      res.status(404).json({ status: 'error', message: 'Saved report not found' });
      return;
    }

    const result = await reportsRepo.executeReportGeneration(tenantId, userId, {
      reportCode: definition.code,
      format: (req.body.format || 'CSV') as any,
      branchId: req.body.branchId || null,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      filters: req.body.filters || {},
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: `Executed "${definition.name}" successfully (${result.rows.length} rows).`,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Direct execution failed' });
  }
};