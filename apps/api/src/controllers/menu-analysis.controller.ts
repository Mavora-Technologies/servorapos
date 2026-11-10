import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as menuRepo from '../repositories/menu-analysis.repository';
import {
  applyPriceRecommendationSchema,
  menuAnalysisQuerySchema,
} from '../validators/menu-analysis.validator';

export const getMenuAnalysis = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = menuAnalysisQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const data = await menuRepo.getMenuAnalysisTelemetry(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Menu engineering analysis failed' });
  }
};

export const postApplyPriceRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = applyPriceRecommendationSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await menuRepo.applyPriceAdjustment(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Price for "${updated.name}" updated to KES ${updated.price}.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Price adjustment failed' });
  }
};