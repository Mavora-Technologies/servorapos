import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as reconRepo from '../repositories/cash-reconciliation.repository';
import {
  reconciliationQuerySchema,
  performReconciliationAuditSchema,
} from '../validators/cash-reconciliation.validator';

export const getReconciliationTelemetry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const dateStr = req.query.date ? String(req.query.date) : undefined;

    const data = await reconRepo.getReconciliationDailyTelemetry(tenantId, branchId, dateStr);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate reconciliation telemetry' });
  }
};

export const getReconciliationAuditList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = reconciliationQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query parameters', errors: parseResult.error.issues });
      return;
    }

    const data = await reconRepo.listReconciliationAuditRecords(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list reconciliation records' });
  }
};

export const postAuditResolution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const supervisorId = req.user?.userId;
    if (!tenantId || !supervisorId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = performReconciliationAuditSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid audit payload', errors: parseResult.error.issues });
      return;
    }

    const result = await reconRepo.submitSupervisorAuditResolution(tenantId, supervisorId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Audit resolution signed off for shift #${parseResult.data.shiftId}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to sign off audit resolution' });
  }
};