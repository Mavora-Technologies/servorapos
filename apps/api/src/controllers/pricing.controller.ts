// apps/api/src/controllers/pricing.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as pricingService from '../services/pricing.service';
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  bulkUpdatePricesSchema,
} from '../validators/pricing.validator';

export const getPricingOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const data = await pricingService.fetchTenantPricingOverview(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch pricing data';
    res.status(500).json({ status: 'error', message });
  }
};

export const bulkUpdatePrices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { updates } = bulkUpdatePricesSchema.parse(req.body);
    const result = await pricingService.saveBulkBasePrices(tenantId, updates);

    res.status(200).json({
      status: 'success',
      message: `Updated ${result.updatedCount} base price(s) successfully.`,
      data: result,
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
    const message = error instanceof Error ? error.message : 'Failed to update base prices';
    res.status(400).json({ status: 'error', message });
  }
};

export const createPricingRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createPricingRuleSchema.parse(req.body);
    const branchId = req.user?.defaultBranchId ?? null;
    const rule = await pricingService.registerPricingRule(tenantId, branchId, payload);

    res.status(201).json({ status: 'success', data: rule });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to create pricing rule';
    res.status(400).json({ status: 'error', message });
  }
};

export const updatePricingRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const ruleId = Number(req.params.id);
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid pricing rule ID' });
      return;
    }

    const payload = updatePricingRuleSchema.parse(req.body);
    const updated = await pricingService.modifyPricingRule(tenantId, ruleId, payload);

    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Pricing rule not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Validation failed',
        errors: error.issues,
      });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update pricing rule';
    res.status(400).json({ status: 'error', message });
  }
};

export const deletePricingRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const ruleId = Number(req.params.id);
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      res.status(400).json({ status: 'error', message: 'Invalid pricing rule ID' });
      return;
    }

    const deleted = await pricingService.removePricingRule(tenantId, ruleId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'Pricing rule not found' });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Pricing rule deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete pricing rule';
    res.status(500).json({ status: 'error', message });
  }
};