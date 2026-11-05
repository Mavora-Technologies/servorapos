// apps/api/src/controllers/modifier.controller.ts
import { Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { modifierGroups, modifierOptions } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createModifierGroupSchema } from '../validators/modifier.validator';

export const getModifiers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const groups = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.tenantId, tenantId))
      .orderBy(desc(modifierGroups.createdAt));

    const groupIds = groups.map((g) => g.id);

    const allOptions = groupIds.length > 0
      ? await db.select().from(modifierOptions)
      : [];

    const result = groups.map((group) => ({
      ...group,
      options: allOptions.filter((opt) => opt.modifierGroupId === group.id),
    }));

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    console.error('[Modifiers Controller Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch modifiers' });
  }
};

export const createModifierGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const validated = createModifierGroupSchema.parse(req.body);

    const createdGroup = await db.transaction(async (tx) => {
      const [group] = await tx
        .insert(modifierGroups)
        .values({
          tenantId,
          name: validated.name,
          description: validated.description,
          minSelections: validated.minSelections,
          maxSelections: validated.maxSelections,
          isRequired: validated.isRequired,
        })
        .returning();

      const optionInserts = validated.options.map((opt) => ({
        modifierGroupId: group.id,
        name: opt.name,
        priceAdjustment: opt.priceAdjustment.toFixed(2),
        isDefault: opt.isDefault,
        isAvailable: opt.isAvailable,
      }));

      const options = await tx.insert(modifierOptions).values(optionInserts).returning();

      return { ...group, options };
    });

    res.status(201).json({ status: 'success', data: createdGroup });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ status: 'error', errors: error.errors });
      return;
    }
    console.error('[Create Modifier Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create modifier group' });
  }
};

export const deleteModifierGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    await db
      .delete(modifierGroups)
      .where(eq(modifierGroups.id, Number(id)));

    res.status(200).json({ status: 'success', message: 'Modifier group deleted' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};