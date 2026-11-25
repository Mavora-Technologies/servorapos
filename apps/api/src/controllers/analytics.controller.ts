// apps/api/src/controllers/analytics.controller.ts
import { Response } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import * as analyticsService from '../services/analytics.service';
import { dashboardAnalyticsQuerySchema } from '../validators/analytics.validator';

export const getDashboardAnalytics = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.tenantId || !user?.userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const query = dashboardAnalyticsQuerySchema.parse(req.query);
    const data = await analyticsService.fetchExecutiveDashboard(
      {
        tenantId: user.tenantId,
        userId: user.userId,
        role: user.role,
      },
      query
    );

    res.status(200).json({ status: 'success', data });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        status: 'error',
        message: error.issues[0]?.message || 'Invalid dashboard filter parameters',
        errors: error.issues,
      });
      return;
    }

    if (error instanceof analyticsService.ForbiddenBranchError) {
      res.status(403).json({ status: 'error', message: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : 'Analytics query failed';
    res.status(500).json({ status: 'error', message });
  }
};