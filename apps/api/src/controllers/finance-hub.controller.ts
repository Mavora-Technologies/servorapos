import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as financeHubRepo from '../repositories/finance-hub.repository';
import { financeHubQuerySchema } from '../validators/finance-hub.validator';

export const getFinanceOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = financeHubQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid query parameters', errors: parseResult.error.issues });
      return;
    }

    const [overview, recentLedger] = await Promise.all([
      financeHubRepo.getExecutiveFinanceOverview(tenantId, parseResult.data),
      financeHubRepo.getRecentTreasuryLedger(tenantId, parseResult.data.branchId, 15),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview,
        recentLedger,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate finance cockpit' });
  }
};