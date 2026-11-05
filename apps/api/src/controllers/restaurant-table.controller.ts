import { Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { restaurantTables } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';

export const getRestaurantTables = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const tables = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.tenantId, tenantId))
      .orderBy(restaurantTables.tableLabel);

    res.status(200).json({ status: 'success', data: tables });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};