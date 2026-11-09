import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as builderRepo from '../repositories/custom-report-builder.repository';
import {
  runCustomReportPreviewSchema,
  saveCustomReportDefinitionSchema,
  exportCustomReportSchema,
} from '../validators/custom-report-builder.validator';

export const getDatasetsMetadata = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subjectAreas = builderRepo.getAvailableSubjectAreas();
    res.status(200).json({
      status: 'success',
      data: subjectAreas,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch datasets metadata' });
  }
};

export const postPreviewReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = runCustomReportPreviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await builderRepo.executeCustomReportQuery(tenantId, parseResult.data);

    res.status(200).json({
      status: 'success',
      data: result,
      message: `Dynamic query executed in ${result.executionDurationMs}ms (${result.rowCount} records projected).`,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to execute custom report' });
  }
};

export const postSaveCustomReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = saveCustomReportDefinitionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const saved = await builderRepo.saveCustomReport(tenantId, parseResult.data);

    res.status(201).json({
      status: 'success',
      data: saved,
      message: `Custom report "${saved.name}" saved to template catalog.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to save custom report' });
  }
};

export const getSavedCustomReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const list = await builderRepo.listTenantCustomReports(tenantId);
    res.status(200).json({
      status: 'success',
      data: list,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list saved custom reports' });
  }
};

export const exportCustomReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = exportCustomReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const query = parseResult.data;
    const result = await builderRepo.executeCustomReportQuery(tenantId, query);

    if (query.format === 'JSON') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${query.reportName}-${Date.now()}.json`);
      res.status(200).send(JSON.stringify(result.rows, null, 2));
      return;
    }

    // Default: CSV formatting
    const headerRow = result.columns.map((c) => `"${c.label}"`).join(',');
    const dataRows = result.rows.map((row) =>
      result.columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const csv = [headerRow, ...dataRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${query.reportName}-${Date.now()}.csv`);
    res.status(200).send(csv);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
  }
};