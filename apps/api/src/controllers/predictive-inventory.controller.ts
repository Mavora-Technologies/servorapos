import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as predRepo from '../repositories/predictive-inventory.repository';
import {
  convertToPurchaseOrderSchema,
  dismissRecommendationSchema,
  predictiveInventoryQuerySchema,
} from '../validators/predictive-inventory.validator';

export const getPredictiveInventoryOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = predictiveInventoryQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const data = await predRepo.getPredictivePurchasingTelemetry(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate predictive inventory telemetry' });
  }
};

export const postConvertToPO = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = convertToPurchaseOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await predRepo.convertRecommendationToPO(tenantId, userId, parseResult.data);
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Conversion to purchase order failed' });
  }
};

export const postDismissRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = dismissRecommendationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid dismissal parameters' });
      return;
    }

    const dismissed = await predRepo.dismissReplenishmentRecommendation(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: dismissed,
      message: 'Recommendation dismissed and logged for historical regression review.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Dismissal failed' });
  }
};