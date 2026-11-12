import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as taxesRepo from '../repositories/taxes.repository';
import {
  taxReportQuerySchema,
  updateTaxSettingsSchema,
  createTaxCodeSchema,
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
    const periodType = (req.query.periodType as 'MONTH' | 'QUARTER' | 'YEAR') || 'MONTH';
    const periodYear = req.query.year ? parseInt(String(req.query.year), 10) : undefined;
    const periodMonth = req.query.month ? parseInt(String(req.query.month), 10) : undefined;
    const periodQuarter = req.query.quarter ? parseInt(String(req.query.quarter), 10) : undefined;

    const [telemetry, settings, codes] = await Promise.all([
      taxesRepo.getTaxLiabilityTelemetry(tenantId, {
        branchId,
        periodType,
        periodYear,
        periodMonth,
        periodQuarter,
      }),
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
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = updateTaxSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid tax configuration', errors: parseResult.error.issues });
      return;
    }

    const updated = await taxesRepo.updateTenantTaxSettings(tenantId, userId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Tax configuration and fiscal device parameters updated.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update tax settings' });
  }
};

export const postCreateTaxCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createTaxCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid tax code payload', errors: parseResult.error.issues });
      return;
    }

    const created = await taxesRepo.createTaxCodeRecord(tenantId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Tax code ${created.code} (${created.rate}%) registered.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create tax code' });
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