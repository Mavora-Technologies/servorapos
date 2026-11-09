import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as billingRepo from '../repositories/billing.repository';
import {
  updateSubscriptionPlanSchema,
  addPaymentMethodSchema,
  listInvoicesQuerySchema,
  settleInvoiceSchema,
} from '../validators/billing.validator';

export const getBillingDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const overview = await billingRepo.getBillingOverview(tenantId);
    res.status(200).json({ status: 'success', data: overview });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch billing details' });
  }
};

export const putSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = updateSubscriptionPlanSchema.parse(req.body);
    const updated = await billingRepo.updateTenantSubscription(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Subscription plan and licensing allocation updated.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update subscription' });
  }
};

export const getInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = listInvoicesQuerySchema.parse(req.query);
    const result = await billingRepo.listTenantInvoices(tenantId, query);

    res.status(200).json({
      status: 'success',
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve invoices' });
  }
};

export const postPaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = addPaymentMethodSchema.parse(req.body);
    const method = await billingRepo.addPaymentMethod(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: method,
      message: 'Payment method authorization token saved.',
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to add payment method' });
  }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const methodId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(methodId)) {
      res.status(400).json({ status: 'error', message: 'Valid payment method ID required' });
      return;
    }

    await billingRepo.deletePaymentMethod(tenantId, methodId);
    res.status(200).json({ status: 'success', message: 'Payment method removed.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to delete payment method' });
  }
};

export const postSetDefaultPaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const methodId = parseInt(String(req.params.id), 10);

    if (!tenantId || isNaN(methodId)) {
      res.status(400).json({ status: 'error', message: 'Valid payment method ID required' });
      return;
    }

    const updated = await billingRepo.setDefaultPaymentMethod(tenantId, methodId);
    res.status(200).json({ status: 'success', data: updated, message: 'Default payment method set.' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to set default payment method' });
  }
};

export const postSettleInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const input = settleInvoiceSchema.parse(req.body);
    const settled = await billingRepo.settleInvoice(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: settled,
      message: `Invoice ${settled.invoiceNumber} marked as settled.`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      const detailed = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: error.errors });
      return;
    }
    res.status(400).json({ status: 'error', message: error.message || 'Failed to settle invoice' });
  }
};