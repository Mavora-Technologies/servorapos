import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as auditRepo from '../repositories/audit-log.repository';
import { listAuditLogsQuerySchema, exportAuditLogsQuerySchema } from '../validators/audit-log.validator';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listAuditLogsQuerySchema.parse(req.query);
    const result = await auditRepo.listAuditLogs(tenantId, query);

    res.status(200).json({
      status: 'success',
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve audit logs' });
  }
};

export const getAuditLogDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const logId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(logId)) {
      res.status(400).json({ status: 'error', message: 'Valid audit log ID is required' });
      return;
    }

    const log = await auditRepo.getAuditLogById(tenantId, logId);
    if (!log) {
      res.status(404).json({ status: 'error', message: 'Audit record not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: log });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve audit log detail' });
  }
};

export const getAuditTelemetry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const telemetry = await auditRepo.getAuditLogTelemetry(tenantId);
    res.status(200).json({ status: 'success', data: telemetry });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve telemetry' });
  }
};

export const getFilterOptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const options = await auditRepo.getDynamicFilterOptions(tenantId);
    res.status(200).json({ status: 'success', data: options });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve filter options' });
  }
};

export const exportAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = exportAuditLogsQuerySchema.parse(req.query);
    const result = await auditRepo.listAuditLogs(tenantId, { ...query, page: 1, limit: 5000 });

    if (query.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
      res.status(200).send(JSON.stringify(result.records, null, 2));
      return;
    }

    // Default CSV formatting
    const headers = ['Timestamp', 'Module', 'Action', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Email', 'Branch', 'IP Address', 'Reason'];
    const rows = result.records.map((r) => [
      `"${new Date(r.createdAt).toISOString()}"`,
      `"${r.module}"`,
      `"${r.action}"`,
      `"${r.entityType}"`,
      `"${r.entityId}"`,
      `"${(r.actorName || 'System').replace(/"/g, '""')}"`,
      `"${(r.actorEmail || '').replace(/"/g, '""')}"`,
      `"${(r.branchName || '').replace(/"/g, '""')}"`,
      `"${r.ipAddress || ''}"`,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to export audit logs' });
  }
};