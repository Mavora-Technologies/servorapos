import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as rewardsRepo from '../repositories/loyalty-rewards.repository';
import {
  createRewardItemSchema,
  listRewardsQuerySchema,
  redeemRewardSchema,
  updateRewardItemSchema,
} from '../validators/loyalty-rewards.validator';

export const getRewardsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await rewardsRepo.getRewardsDashboardMetrics(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch rewards metrics' });
  }
};

export const getRewardsCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listRewardsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await rewardsRepo.listCatalogRewards(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.rewards,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list rewards' });
  }
};

export const postReward = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createRewardItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await rewardsRepo.createRewardItem(tenantId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Reward "${created.name}" published to catalog.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create reward' });
  }
};

export const patchReward = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const rewardId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(rewardId)) {
      res.status(400).json({ status: 'error', message: 'Valid reward ID required' });
      return;
    }

    const parseResult = updateRewardItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await rewardsRepo.updateRewardItem(tenantId, rewardId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Reward item not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Reward "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update reward' });
  }
};

export const postRedeemReward = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = redeemRewardSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await rewardsRepo.executeRewardRedemption(tenantId, userId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Redeemed "${result.reward.name}" (-${result.pointsBurned} pts). New balance: ${result.newBalance} pts.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Redemption failed' });
  }
};