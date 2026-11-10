import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as taxesRepo from '../repositories/taxes.repository';
import {
  taxReportQuerySchema,
  updateTaxSettingsSchema,
  retryFiscalizationSchema,
} from '../validators/taxes.validator';

export const getTaxOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const periodYear = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const periodMonth = req.query.month ? parseInt(String(req.query.month), 10) : undefined;

    const [telemetry, settings, codes] = await Promise.all([
      taxesRepo.getTaxLiabilityTelemetry(tenantId, branchId, periodYear, periodMonth),
      taxesRepo.getTenantTaxSettings(tenantId),
      taxesRepo.listTaxCodes(tenantId),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        telemetry,
        settings,
        taxCodes: codes,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate tax telemetry' });
  }
};

export const getFiscalInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    // Defensive check to immediately identify import issues
    if (!taxReportQuerySchema || typeof taxReportQuerySchema.safeParse !== 'function') {
      res.status(500).json({
        status: 'error',
        message: 'taxReportQuerySchema is not properly defined or imported in taxes.controller',
      });
      return;
    }

    const parseResult = taxReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
      return;
    }

    const data = await taxesRepo.listFiscalInvoices(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list fiscal invoices' });
  }
};

export const patchTaxSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = updateTaxSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid tax configuration', errors: parseResult.error.issues });
      return;
    }

    const updated = await taxesRepo.updateTenantTaxSettings(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Tax configuration and fiscal device parameters updated.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update tax settings' });
  }
};

export const postRetryFiscalization = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = retryFiscalizationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid payload', errors: parseResult.error.issues });
      return;
    }

    const updated = await taxesRepo.retryInvoiceFiscalization(tenantId, parseResult.data.fiscalInvoiceId);
    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Invoice #${updated.id} queued for eTIMS fiscal retry.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to retry fiscalization' });
  }
};