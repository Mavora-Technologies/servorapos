// apps/api/src/controllers/billing.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as billingService from '../services/billing.service';
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

    const overview = await billingService.fetchTenantBillingOverview(tenantId);
    res.status(200).json({ status: 'success', data: overview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch billing details';
    res.status(500).json({ status: 'error', message });
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
    const result = await billingService.saveTenantSubscription(tenantId, input);

    res.status(200).json({
      status: 'success',
      data: result.subscription,
      invoice: result.invoice,
      message: result.invoice
        ? `Subscription updated and invoice ${result.invoice.invoiceNumber} issued.`
        : 'Subscription plan and licensing allocation updated.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update subscription';
    res.status(400).json({ status: 'error', message });
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
    const result = await billingService.fetchTenantInvoices(tenantId, query);

    res.status(200).json({
      status: 'success',
      data: result.invoices,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid invoice filter query',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to retrieve invoices';
    res.status(500).json({ status: 'error', message });
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
    const method = await billingService.registerPaymentMethod(tenantId, input);

    res.status(201).json({
      status: 'success',
      data: method,
      message: 'Payment mandate registered successfully.',
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to add payment method';
    res.status(400).json({ status: 'error', message });
  }
};

export const deletePaymentMethod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const methodId = Number(req.params.id);
    if (!Number.isInteger(methodId) || methodId <= 0) {
      res.status(400).json({ status: 'error', message: 'Valid payment method ID required' });
      return;
    }

    const deleted = await billingService.removePaymentMethod(tenantId, methodId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Payment method mandate not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Payment method removed.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete payment method';
    res.status(400).json({ status: 'error', message });
  }
};

export const postSetDefaultPaymentMethod = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const methodId = Number(req.params.id);
    if (!Number.isInteger(methodId) || methodId <= 0) {
      res.status(400).json({ status: 'error', message: 'Valid payment method ID required' });
      return;
    }

    const updated = await billingService.markDefaultPaymentMethod(tenantId, methodId);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Payment method mandate not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Primary payment mandate updated.',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update default payment method';
    res.status(400).json({ status: 'error', message });
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
    const settled = await billingService.processInvoiceSettlement(tenantId, input);

    if (!settled) {
      res.status(404).json({ status: 'error', message: 'Invoice not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: settled,
      message: `Invoice ${settled.invoiceNumber} marked as settled.`,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to settle invoice';
    res.status(400).json({ status: 'error', message });
  }
};