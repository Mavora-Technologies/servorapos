// apps/api/src/controllers/recipe-costing.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as costingService from '../services/recipe-costing.service';
import { recipeCostingQuerySchema } from '../validators/recipe-costing.validator';

export const getRecipeCostingAnalytics = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const parsed = recipeCostingQuerySchema.parse(req.query);
    const data = await costingService.computeTenantCostingMatrix(tenantId, parsed);

    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid query parameters',
        errors: error.issues,
      });
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to fetch recipe costing analytics';
    res.status(500).json({ status: 'error', message });
  }
};