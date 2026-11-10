import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as forecastRepo from '../repositories/forecasting.repository';
import {
  adjustForecastModifierSchema,
  forecastingQuerySchema,
} from '../validators/forecasting.validator';

export const getForecastOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = forecastingQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      res.status(400).json({ status: 'error', message: detailed, errors: issues });
      return;
    }

    const data = await forecastRepo.getDemandForecastingTelemetry(tenantId, parseResult.data);
    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Demand forecast computation failed' });
  }
};

export const patchForecastModifier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized session' });
      return;
    }

    const parseResult = adjustForecastModifierSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ status: 'error', message: 'Invalid forecast modifier parameters' });
      return;
    }

    const updated = await forecastRepo.updateSnapshotModifier(tenantId, parseResult.data);
    res.status(200).json({
      status: 'success',
      data: updated,
      message: 'Forecasting model recalibrated successfully.',
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message || 'Failed to update forecast' });
  }
};