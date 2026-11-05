// apps/api/src/controllers/pricing.controller.ts
import { Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { menuItems, itemPricingRules } from '../config/schema';
import { AuthRequest } from '../middleware/auth.middleware';
import { createPricingRuleSchema, bulkUpdatePricesSchema } from '../validators/pricing.validator';

// 1. Get all menu items with their base prices and active pricing rules
export const getPricingOverview = async (req: AuthRequest, res: Response): Promise<void> => {
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
        isAvailable: menuItems.isAvailable,
      })
      .from(menuItems)
      .where(eq(menuItems.tenantId, tenantId))
      .orderBy(desc(menuItems.id));

    const rules = await db
      .select({
        id: itemPricingRules.id,
        menuItemId: itemPricingRules.menuItemId,
        ruleName: itemPricingRules.ruleName,
        ruleType: itemPricingRules.ruleType,
        value: itemPricingRules.value,
        startTime: itemPricingRules.startTime,
        endTime: itemPricingRules.endTime,
        daysOfWeek: itemPricingRules.daysOfWeek,
        isActive: itemPricingRules.isActive,
      })
      .from(itemPricingRules)
      .where(eq(itemPricingRules.tenantId, tenantId))
      .orderBy(desc(itemPricingRules.createdAt));

    const data = items.map((item) => ({
      ...item,
      rules: rules.filter((r) => r.menuItemId === item.id),
    }));

    res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    console.error('[Pricing Overview Error]:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch pricing data' });
  }
};

// 2. Bulk update base item prices (instant inline edits)
export const bulkUpdatePrices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const { updates } = bulkUpdatePricesSchema.parse(req.body);

    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(menuItems)
          .set({ price: update.price.toFixed(2), updatedAt: new Date() })
          .where(and(eq(menuItems.id, update.id), eq(menuItems.tenantId, tenantId)));
      }
    });

    res.status(200).json({ status: 'success', message: 'Prices updated successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 3. Create a dynamic price rule (Happy hour, surge, etc.)
export const createPricingRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const branchId = req.user?.defaultBranchId;
    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const payload = createPricingRuleSchema.parse(req.body);

    const [rule] = await db
      .insert(itemPricingRules)
      .values({
        tenantId,
        branchId: branchId || null,
        menuItemId: payload.menuItemId,
        ruleName: payload.ruleName,
        ruleType: payload.ruleType,
        value: payload.value.toFixed(2),
        startTime: payload.startTime || null,
        endTime: payload.endTime || null,
        daysOfWeek: payload.daysOfWeek || 'ALL',
        isActive: payload.isActive ?? true,
      })
      .returning();

    res.status(201).json({ status: 'success', data: rule });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// 4. Delete a pricing rule
export const deletePricingRule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    await db
      .delete(itemPricingRules)
      .where(and(eq(itemPricingRules.id, Number(id)), eq(itemPricingRules.tenantId, tenantId)));

    res.status(200).json({ status: 'success', message: 'Rule removed successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};