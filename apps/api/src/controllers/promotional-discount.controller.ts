import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as promoRepo from '../repositories/promotional-discount.repository';
import {
  createPromotionSchema,
  listPromotionsQuerySchema,
  updatePromotionSchema,
  validatePromoCodeSchema,
} from '../validators/promotional-discount.validator';

export const getPromotionsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await promoRepo.getPromotionsDashboardMetrics(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate promotions telemetry' });
  }
};

export const getPromotions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listPromotionsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await promoRepo.listTenantPromotions(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.promotions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list promotional discounts' });
  }
};

export const postPromotion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createPromotionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await promoRepo.createPromotionRecord(tenantId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Promo code "${created.code}" registered and ready for checkout redemption.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to register promotional discount' });
  }
};

export const patchPromotion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const promoId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(promoId)) {
      res.status(400).json({ status: 'error', message: 'Valid promotion ID required' });
      return;
    }

    const parseResult = updatePromotionSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await promoRepo.updatePromotionRecord(tenantId, promoId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Promotion not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Promotion "${updated.code}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update promotion' });
  }
};

export const postValidatePromoCode = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = validatePromoCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const verification = await promoRepo.validatePromoCodeRule(tenantId, parseResult.data);
    res.status(verification.valid ? 200 : 422).json({
      status: verification.valid ? 'success' : 'error',
      data: verification,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Validation failed' });
  }
};