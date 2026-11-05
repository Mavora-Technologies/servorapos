import { Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { menuItems } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMenuItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.tenantId, tenantId))
      .orderBy(desc(menuItems.id));

    res.status(200).json({
      status: 'success',
      data: items,
    });
  } catch (error: any) {
    console.error('[Get Menu Items Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch menu items' });
  }
};