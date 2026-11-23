// apps/api/src/repositories/pricing.repository.ts
import { eq, and, desc, asc, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { menuItems, menuCategories, itemPricingRules } from '../config/schema';
import type {
  BulkUpdatePricesInput,
  CreatePricingRuleInput,
  UpdatePricingRuleInput,
} from '../validators/pricing.validator';

export const findPricingDataByTenant = async (tenantId: number) => {
  const [items, rules] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        categoryId: menuItems.categoryId,
        categoryName: menuCategories.name,
        name: menuItems.name,
        sku: menuItems.sku,
        price: menuItems.price,
        costEstimate: menuItems.costEstimate,
        isAvailable: menuItems.isAvailable,
      })
      .from(menuItems)
      .leftJoin(
        menuCategories,
        and(eq(menuItems.categoryId, menuCategories.id), eq(menuCategories.tenantId, tenantId))
      )
      .where(eq(menuItems.tenantId, tenantId))
      .orderBy(asc(menuCategories.name), asc(menuItems.name)),

    db
      .select({
        id: itemPricingRules.id,
        branchId: itemPricingRules.branchId,
        menuItemId: itemPricingRules.menuItemId,
        ruleName: itemPricingRules.ruleName,
        ruleType: itemPricingRules.ruleType,
        value: itemPricingRules.value,
        startTime: itemPricingRules.startTime,
        endTime: itemPricingRules.endTime,
        daysOfWeek: itemPricingRules.daysOfWeek,
        isActive: itemPricingRules.isActive,
        createdAt: itemPricingRules.createdAt,
      })
      .from(itemPricingRules)
      .where(eq(itemPricingRules.tenantId, tenantId))
      .orderBy(desc(itemPricingRules.createdAt)),
  ]);

  return { items, rules };
};

export const bulkUpdateBasePricesTransaction = async (
  tenantId: number,
  updates: BulkUpdatePricesInput['updates']
) => {
  return await db.transaction(async (tx) => {
    const uniqueIds = Array.from(new Set(updates.map((u) => u.id)));
    const ownedItems = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueIds)));

    if (ownedItems.length !== uniqueIds.length) {
      throw new Error(
        'One or more menu items do not exist or do not belong to this tenant.'
      );
    }

    for (const update of updates) {
      await tx
        .update(menuItems)
        .set({
          price: update.price.toFixed(2),
          updatedAt: new Date(),
        })
        .where(and(eq(menuItems.id, update.id), eq(menuItems.tenantId, tenantId)));
    }

    return { updatedCount: updates.length };
  });
};

export const createPricingRuleTransaction = async (
  tenantId: number,
  defaultBranchId: number | null,
  payload: CreatePricingRuleInput
) => {
  return await db.transaction(async (tx) => {
    const [item] = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(
        and(eq(menuItems.id, payload.menuItemId), eq(menuItems.tenantId, tenantId))
      )
      .limit(1);

    if (!item) {
      throw new Error('Target menu item does not exist or does not belong to this tenant.');
    }

    const [created] = await tx
      .insert(itemPricingRules)
      .values({
        tenantId,
        branchId: payload.branchId !== undefined ? payload.branchId : defaultBranchId,
        menuItemId: payload.menuItemId,
        ruleName: payload.ruleName,
        ruleType: payload.ruleType,
        value: payload.value.toFixed(2),
        startTime: payload.startTime ?? null,
        endTime: payload.endTime ?? null,
        daysOfWeek: payload.daysOfWeek || 'ALL',
        isActive: payload.isActive,
      })
      .returning();

    return created;
  });
};

export const updatePricingRuleTransaction = async (
  tenantId: number,
  ruleId: number,
  payload: UpdatePricingRuleInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(itemPricingRules)
      .where(and(eq(itemPricingRules.id, ruleId), eq(itemPricingRules.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      return null;
    }

    if (payload.menuItemId !== undefined) {
      const [item] = await tx
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(
          and(eq(menuItems.id, payload.menuItemId), eq(menuItems.tenantId, tenantId))
        )
        .limit(1);
      if (!item) {
        throw new Error('Target menu item does not exist or does not belong to this tenant.');
      }
    }

    const nextRuleType = payload.ruleType ?? existing.ruleType;
    const nextValue = payload.value ?? parseFloat(existing.value);
    const nextStart = payload.startTime !== undefined ? payload.startTime : existing.startTime;
    const nextEnd = payload.endTime !== undefined ? payload.endTime : existing.endTime;

    if (nextRuleType === 'PERCENTAGE_DISCOUNT' && (nextValue <= 0 || nextValue > 100)) {
      throw new Error('Percentage discount must be between 0.01% and 100%.');
    }
    if ((nextStart && !nextEnd) || (!nextStart && nextEnd)) {
      throw new Error('Provide both start time and end time, or leave both blank.');
    }

    const updateFields: Partial<typeof itemPricingRules.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (payload.menuItemId !== undefined) updateFields.menuItemId = payload.menuItemId;
    if (payload.branchId !== undefined) updateFields.branchId = payload.branchId;
    if (payload.ruleName !== undefined) updateFields.ruleName = payload.ruleName;
    if (payload.ruleType !== undefined) updateFields.ruleType = payload.ruleType;
    if (payload.value !== undefined) updateFields.value = payload.value.toFixed(2);
    if (payload.startTime !== undefined) updateFields.startTime = payload.startTime;
    if (payload.endTime !== undefined) updateFields.endTime = payload.endTime;
    if (payload.daysOfWeek !== undefined) updateFields.daysOfWeek = payload.daysOfWeek;
    if (payload.isActive !== undefined) updateFields.isActive = payload.isActive;

    const [updated] = await tx
      .update(itemPricingRules)
      .set(updateFields)
      .where(and(eq(itemPricingRules.id, ruleId), eq(itemPricingRules.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  });
};

export const deletePricingRuleRecord = async (tenantId: number, ruleId: number) => {
  const [deleted] = await db
    .delete(itemPricingRules)
    .where(and(eq(itemPricingRules.id, ruleId), eq(itemPricingRules.tenantId, tenantId)))
    .returning({ id: itemPricingRules.id });

  return deleted ?? null;
};