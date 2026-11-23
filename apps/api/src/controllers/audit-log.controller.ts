// apps/api/src/controllers/audit-log.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as auditService from '../services/audit-log.service';
import {
  listAuditLogsQuerySchema,
  exportAuditLogsQuerySchema,
} from '../validators/audit-log.validator';

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listAuditLogsQuerySchema.parse(req.query);
    const result = await auditService.listTenantAuditLogs(tenantId, query);

    res.status(200).json({
      status: 'success',
      data: result.records,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid filter query',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve audit logs';
    res.status(500).json({ status: 'error', message });
  }
};

export const getAuditLogDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const logId = Number(req.params.id);
    if (!Number.isInteger(logId) || logId <= 0) {
      res.status(400).json({ status: 'error', message: 'Valid audit log ID is required' });
      return;
    }

    const log = await auditService.getTenantAuditLogDetail(tenantId, logId);
    if (!log) {
      res.status(404).json({ status: 'error', message: 'Audit record not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: log });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve audit log detail';
    res.status(500).json({ status: 'error', message });
  }
};

export const getAuditTelemetry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const telemetry = await auditService.getTenantAuditTelemetry(tenantId);
    res.status(200).json({ status: 'success', data: telemetry });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve telemetry';
    res.status(500).json({ status: 'error', message });
  }
};

export const getFilterOptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const options = await auditService.getTenantFilterOptions(tenantId);
    res.status(200).json({ status: 'success', data: options });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve filter options';
    res.status(500).json({ status: 'error', message });
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
    const exported = await auditService.buildTenantAuditExport(tenantId, query);

    // Log the compliance export itself
    void auditService.logAuditEvent(tenantId, {
      branchId: req.user?.defaultBranchId ?? null,
      userId: req.user?.userId ?? null,
      action: 'AUDIT_LOGS_EXPORTED',
      module: 'SECURITY',
      entityType: 'audit_logs',
      entityId: `${exported.count}_records`,
      reason: `Exported ${exported.count} audit records as ${query.format.toUpperCase()}`,
      newValues: { format: query.format, filters: query, recordCount: exported.count },
      ipAddress:
        (typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : req.ip) ?? null,
    });

    res.setHeader('Content-Type', exported.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.${exported.extension}`
    );
    res.status(200).send(exported.body);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid export parameters',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to export audit logs';
    res.status(500).json({ status: 'error', message });
  }
};