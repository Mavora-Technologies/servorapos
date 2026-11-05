// apps/api/src/controllers/availability.controller.ts
import { Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { menuItems, menuItemAvailability, menuCategories } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { updateAvailabilitySchema } from '../validators/availability.validator';

export const getAvailabilityOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const items = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        price: menuItems.price,
        categoryId: menuItems.categoryId,
        categoryName: menuCategories.name,
        isAvailable: menuItems.isAvailable,
      })
      .from(menuItems)
      .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
      .where(eq(menuItems.tenantId, tenantId))
      .orderBy(desc(menuItems.id));

    const records = await db
      .select()
      .from(menuItemAvailability)
      .where(eq(menuItemAvailability.tenantId, tenantId));

    const recordMap = new Map(records.map((r) => [r.menuItemId, r]));

    let availableCount = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    const formattedItems = items.map((item) => {
      const avail = recordMap.get(item.id);
      const is86ed = avail ? avail.is86ed : !item.isAvailable;
      const remainingCount = avail?.remainingCount ?? null;

      if (is86ed) {
        outOfStockCount++;
      } else {
        availableCount++;
        if (remainingCount !== null && remainingCount <= 5) {
          lowStockCount++;
        }
      }

      return {
        ...item,
        is86ed,
        reason: avail?.reason ?? null,
        remainingCount,
        autoResetAt: avail?.autoResetAt ?? null,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          total: items.length,
          available: availableCount,
          outOfStock: outOfStockCount,
          lowStock: lowStockCount,
        },
        items: formattedItems,
      },
    });
  } catch (error: any) {
    console.error('[Availability Overview Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch availability' });
  }
};

export const updateItemAvailability = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = updateAvailabilitySchema.parse(req.body);

    const autoResetDate = payload.autoResetTomorrow
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;

    // Sync menu_items table
    await db
      .update(menuItems)
      .set({ isAvailable: !payload.is86ed, updatedAt: new Date() })
      .where(and(eq(menuItems.id, payload.menuItemId), eq(menuItems.tenantId, tenantId)));

    // Upsert menuItemAvailability table
    const existing = await db
      .select()
      .from(menuItemAvailability)
      .where(
        and(
          eq(menuItemAvailability.menuItemId, payload.menuItemId),
          eq(menuItemAvailability.tenantId, tenantId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(menuItemAvailability)
        .set({
          is86ed: payload.is86ed,
          reason: payload.reason,
          remainingCount: payload.remainingCount,
          autoResetAt: autoResetDate,
          updatedAt: new Date(),
        })
        .where(eq(menuItemAvailability.id, existing[0].id));
    } else {
      await db.insert(menuItemAvailability).values({
        tenantId,
        branchId: branchId || null,
        menuItemId: payload.menuItemId,
        is86ed: payload.is86ed,
        reason: payload.reason,
        remainingCount: payload.remainingCount,
        autoResetAt: autoResetDate,
      });
    }

    res.status(200).json({ status: 'success', message: 'Item stock availability updated' });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};