import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as hubRepo from '../repositories/marketing-hub.repository';
import { marketingOverviewQuerySchema } from '../validators/marketing-hub.validator';

export const getMarketingHubOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = marketingOverviewQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const data = await hubRepo.getMarketingHubExecutiveMetrics(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate marketing command telemetry' });
  }
};