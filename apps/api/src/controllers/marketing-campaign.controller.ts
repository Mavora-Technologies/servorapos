import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as campaignRepo from '../repositories/marketing-campaign.repository';
import {
  createMarketingCampaignSchema,
  listCampaignsQuerySchema,
  updateMarketingCampaignSchema,
} from '../validators/marketing-campaign.validator';

export const getCampaignsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const data = await campaignRepo.getCampaignsOverviewMetrics(tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate campaign metrics' });
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = listCampaignsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const result = await campaignRepo.listTenantCampaigns(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: result.campaigns,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list marketing campaigns' });
  }
};

export const postCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.userId;
    if (!tenantId || !userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = createMarketingCampaignSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const created = await campaignRepo.createMarketingCampaign(tenantId, userId, parseResult.data);
    res.status(201).json({
      status: 'success',
      data: created,
      message: `Campaign "${created.name}" created successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to create campaign' });
  }
};

export const patchCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const campaignId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(campaignId)) {
      res.status(400).json({ status: 'error', message: 'Valid campaign ID required' });
      return;
    }

    const parseResult = updateMarketingCampaignSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const updated = await campaignRepo.updateMarketingCampaign(tenantId, campaignId, parseResult.data);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'Campaign not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: updated,
      message: `Campaign "${updated.name}" updated successfully.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update campaign' });
  }
};

export const postDispatchCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const campaignId = parseInt(String(req.params.id), 10);
    if (!tenantId || isNaN(campaignId)) {
      res.status(400).json({ status: 'error', message: 'Valid campaign ID required' });
      return;
    }

    const dispatched = await campaignRepo.dispatchCampaignRun(tenantId, campaignId);
    res.status(200).json({
      status: 'success',
      data: dispatched,
      message: `Campaign broadcast dispatched to ${dispatched.recipientsCount} recipients.`,
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to dispatch broadcast' });
  }
};

export const getTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const templates = await campaignRepo.listMarketingTemplates(tenantId);
    res.status(200).json({ status: 'success', data: templates });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to list templates' });
  }
};