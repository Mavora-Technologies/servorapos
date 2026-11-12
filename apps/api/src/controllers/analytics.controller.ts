// apps/api/src/controllers/analytics.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsRepo from '../repositories/analytics.repository';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { timeframe = 'today', startDate, endDate, branchId, orderType } = req.query;
    const parsedBranchId =
      branchId && branchId !== 'ALL' ? parseInt(String(branchId), 10) : null;

    const data = await analyticsRepo.getExecutiveDashboardMetrics(tenantId, {
      timeframe: String(timeframe),
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      branchId: parsedBranchId,
      orderType: orderType ? String(orderType) : undefined,
    });

    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    console.error('[Dashboard Analytics Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Analytics query failed' });
  }
};