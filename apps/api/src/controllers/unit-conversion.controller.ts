// apps/api/src/controllers/unit-conversion.controller.ts
import { Response } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { db } from '../config/db';
import { unitConversions, inventoryItems } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createUnitConversionSchema } from '../validators/unit-conversion.validator';

export const getUnitConversions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const conversions = await db
      .select({
        id: unitConversions.id,
        tenantId: unitConversions.tenantId,
        fromUnit: unitConversions.fromUnit,
        toUnit: unitConversions.toUnit,
        conversionFactor: unitConversions.conversionFactor,
        inventoryItemId: unitConversions.inventoryItemId,
        inventoryItemName: inventoryItems.name,
        unitCategory: unitConversions.unitCategory,
        description: unitConversions.description,
        isDefault: unitConversions.isDefault,
        createdAt: unitConversions.createdAt,
      })
      .from(unitConversions)
      .leftJoin(inventoryItems, eq(unitConversions.inventoryItemId, inventoryItems.id))
      .where(eq(unitConversions.tenantId, tenantId))
      .orderBy(desc(unitConversions.id));

    res.status(200).json({ status: 'success', data: conversions });
  } catch (error: any) {
    console.error('[Get Unit Conversions Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch unit conversions' });
  }
};

export const createUnitConversion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const validated = createUnitConversionSchema.parse(req.body);

    const [created] = await db
      .insert(unitConversions)
      .values({
        tenantId,
        fromUnit: validated.fromUnit,
        toUnit: validated.toUnit,
        conversionFactor: validated.conversionFactor.toFixed(4),
        inventoryItemId: validated.inventoryItemId || null,
        unitCategory: validated.unitCategory,
        description: validated.description || null,
      })
      .returning();

    res.status(201).json({ status: 'success', data: created });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteUnitConversion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    await db
      .delete(unitConversions)
      .where(and(eq(unitConversions.id, Number(id)), eq(unitConversions.tenantId, tenantId)));

    res.status(200).json({ status: 'success', message: 'Conversion rule removed' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};