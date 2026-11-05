// apps/api/src/controllers/combo.controller.ts
import { Response } from 'express';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { comboBundles, comboBundleItems, menuItems } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createComboBundleSchema } from '../validators/combo.validator';

export const getCombos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const combos = await db
      .select()
      .from(comboBundles)
      .where(eq(comboBundles.tenantId, tenantId))
      .orderBy(desc(comboBundles.createdAt));

    if (combos.length === 0) {
      res.status(200).json({ status: 'success', data: [] });
      return;
    }

    const comboIds = combos.map((c) => c.id);

    const items = await db
      .select({
        id: comboBundleItems.id,
        comboId: comboBundleItems.comboId,
        menuItemId: comboBundleItems.menuItemId,
        quantity: comboBundleItems.quantity,
        additionalPrice: comboBundleItems.additionalPrice,
        itemName: menuItems.name,
        itemPrice: menuItems.price,
      })
      .from(comboBundleItems)
      .leftJoin(menuItems, eq(comboBundleItems.menuItemId, menuItems.id))
      .where(inArray(comboBundleItems.comboId, comboIds));

    const result = combos.map((combo) => ({
      ...combo,
      items: items.filter((item) => item.comboId === combo.id),
    }));

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('[Get Combos Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch combos' });
  }
};

export const createCombo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const defaultBranchId = req.user?.defaultBranchId;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const validated = createComboBundleSchema.parse(req.body);

    const created = await db.transaction(async (tx) => {
      const [newCombo] = await tx
        .insert(comboBundles)
        .values({
          tenantId,
          branchId: defaultBranchId || null,
          name: validated.name,
          description: validated.description,
          sku: validated.sku,
          basePrice: validated.basePrice.toFixed(2),
          isAvailable: validated.isAvailable,
        })
        .returning();

      const itemInserts = validated.items.map((i) => ({
        comboId: newCombo.id,
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        additionalPrice: i.additionalPrice.toFixed(2),
      }));

      await tx.insert(comboBundleItems).values(itemInserts);

      return newCombo;
    });

    res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    console.error('[Create Combo Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create combo bundle' });
  }
};

export const deleteCombo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    await db
      .delete(comboBundles)
      .where(eq(comboBundles.id, Number(id)));

    res.status(200).json({ status: 'success', message: 'Combo bundle deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};