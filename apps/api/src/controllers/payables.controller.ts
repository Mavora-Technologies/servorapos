import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as payablesRepo from '../repositories/payables.repository';
import {
  listPayablesQuerySchema,
  recordPayableDisbursementSchema,
  createSupplierInvoiceSchema,
} from '../validators/payables.validator';

export const getPayablesOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
    const telemetry = await payablesRepo.getPayablesAgingTelemetry(tenantId, branchId);
    res.status(200).json({ status: 'success', data: telemetry });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate payables telemetry' });
  }
};

export const getPayablesList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listPayablesQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query filters', errors: parseResult.error.issues });
      return;
    }

    const data = await payablesRepo.listTenantPayables(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list supplier bills' });
  }
};

export const postCreateBill = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createSupplierInvoiceSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid supplier invoice payload', errors: parseResult.error.issues });
      return;
    }

    const created = await payablesRepo.createSupplierInvoiceRecord(tenantId, userId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Supplier invoice #${created.invoiceNumber} recorded successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register supplier bill' });
  }
};

export const postDisbursement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = recordPayableDisbursementSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid payment parameters', errors: parseResult.error.issues });
      return;
    }

    const result = await payablesRepo.recordPayableDisbursement(tenantId, userId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Outbound payment ${result.payment.paymentNumber} posted. Remaining balance: KES ${(Number(result.invoice.totalAmount) - Number(result.invoice.paidAmount)).toLocaleString()}`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Disbursement failed' });
  }
};