import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as loyaltyRepo from '../repositories/loyalty.repository';
import {
  adjustLoyaltyPointsSchema,
  createLoyaltyTierSchema,
  createRewardCatalogItemSchema,
  listLoyaltyQuerySchema,
} from '../validators/loyalty.validator';

export const getLoyaltyOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await loyaltyRepo.getLoyaltyDashboardMetrics(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch loyalty analytics' });
  }
};

export const getLoyaltyMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listLoyaltyQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await loyaltyRepo.listLoyaltyMembers(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.members,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list loyalty members' });
  }
};

export const postAdjustPoints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = adjustLoyaltyPointsSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await loyaltyRepo.adjustCustomerPoints(tenantId, userId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Successfully adjusted points (${parseResult.data.points > 0 ? '+' : ''}${parseResult.data.points}).`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to adjust customer points' });
  }
};

export const postLoyaltyTier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createLoyaltyTierSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid tier parameters' });
      return;
    }

    const tier = await loyaltyRepo.createTierRecord(tenantId, parseResult.data);
    res.status(201).json({ status: 'success', data: tier, message: `Tier "${tier.name}" created.` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create tier' });
  }
};

export const postRewardCatalogItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createRewardCatalogItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid reward parameters' });
      return;
    }

    const reward = await loyaltyRepo.createRewardRecord(tenantId, parseResult.data);
    res.status(201).json({ status: 'success', data: reward, message: `Reward "${reward.name}" added to catalog.` });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create reward' });
  }
};