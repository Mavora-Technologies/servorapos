import { Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../config/db';
import { logisticsFleet } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';

export const getLogisticsFleet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const fleet = await db
      .select()
      .from(logisticsFleet)
      .where(and(eq(logisticsFleet.tenantId, tenantId), eq(logisticsFleet.isActive, true)));

    res.status(200).json({ status: 'success', data: fleet });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};