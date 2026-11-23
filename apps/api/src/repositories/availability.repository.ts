// apps/api/src/repositories/availability.repository.ts
import { eq, and, or, isNull, asc, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import {
  menuItems,
  menuCategories,
  menuItemAvailability,
  inventoryItems,
  recipes,
  recipeIngredients,
} from '../config/schema';
import type {
  UpdateAvailabilityInput,
  BulkAvailabilityToggleInput,
} from '../validators/availability.validator';

export const findAvailabilityContext = async (tenantId: number, branchId?: number) => {
  const availFilter = branchId
    ? and(
        eq(menuItemAvailability.tenantId, tenantId),
        or(
          eq(menuItemAvailability.branchId, branchId),
          isNull(menuItemAvailability.branchId)
        )
      )
    : eq(menuItemAvailability.tenantId, tenantId);

  const [items, availabilityRows, tenantInventory, activeRecipes] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        sku: menuItems.sku,
        price: menuItems.price,
        categoryId: menuItems.categoryId,
        categoryName: menuCategories.name,
        stockTrackingType: menuItems.stockTrackingType,
        directInventoryItemId: menuItems.directInventoryItemId,
        isAvailable: menuItems.isAvailable,
      })
      .from(menuItems)
      .leftJoin(
        menuCategories,
        and(eq(menuItems.categoryId, menuCategories.id), eq(menuCategories.tenantId, tenantId))
      )
      .where(and(eq(menuItems.tenantId, tenantId), eq(menuItems.isAvailable, true)))
      .orderBy(asc(menuCategories.name), asc(menuItems.name)),

    db.select().from(menuItemAvailability).where(availFilter),

    db
      .select({
        id: inventoryItems.id,
        name: inventoryItems.name,
        unit: inventoryItems.unit,
        currentStock: inventoryItems.currentStock,
        allowNegativeStock: inventoryItems.allowNegativeStock,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.tenantId, tenantId)),

    db
      .select({
        recipeId: recipes.id,
        menuItemId: recipes.menuItemId,
        yieldPortions: recipes.yieldPortions,
      })
      .from(recipes)
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.isActive, true))),
  ]);

  const recipeIds = activeRecipes.map((r) => r.recipeId);
  const allRecipeIngredients =
    recipeIds.length > 0
      ? await db
          .select({
            recipeId: recipeIngredients.recipeId,
            inventoryItemId: recipeIngredients.inventoryItemId,
            quantity: recipeIngredients.quantity,
            wastagePercentage: recipeIngredients.wastagePercentage,
          })
          .from(recipeIngredients)
          .where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              inArray(recipeIngredients.recipeId, recipeIds)
            )
          )
      : [];

  return {
    items,
    availabilityRows,
    tenantInventory,
    activeRecipes,
    allRecipeIngredients,
  };
};

export const upsertItemAvailabilityTransaction = async (
  tenantId: number,
  effectiveBranchId: number | null,
  payload: UpdateAvailabilityInput,
  autoResetAt: Date | null
) => {
  return await db.transaction(async (tx) => {
    // 1. Verify menu item belongs to authenticated tenant
    const [menuItem] = await tx
      .select({ id: menuItems.id, name: menuItems.name })
      .from(menuItems)
      .where(and(eq(menuItems.id, payload.menuItemId), eq(menuItems.tenantId, tenantId)))
      .limit(1);

    if (!menuItem) {
      return null;
    }

    // 2. Match existing availability row for this tenant + item + branch scope
    const branchMatch = effectiveBranchId
      ? eq(menuItemAvailability.branchId, effectiveBranchId)
      : isNull(menuItemAvailability.branchId);

    const [existing] = await tx
      .select()
      .from(menuItemAvailability)
      .where(
        and(
          eq(menuItemAvailability.tenantId, tenantId),
          eq(menuItemAvailability.menuItemId, payload.menuItemId),
          branchMatch
        )
      )
      .limit(1);

    const nextRemaining =
      payload.is86ed ? 0 : payload.remainingCount !== undefined ? payload.remainingCount : null;
    const nextReason = payload.is86ed ? payload.reason ?? null : null;

    if (existing) {
      const [updated] = await tx
        .update(menuItemAvailability)
        .set({
          is86ed: payload.is86ed,
          reason: nextReason,
          remainingCount: nextRemaining,
          autoResetAt: payload.is86ed ? autoResetAt : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(menuItemAvailability.id, existing.id),
            eq(menuItemAvailability.tenantId, tenantId)
          )
        )
        .returning();

      return updated;
    }

    const [inserted] = await tx
      .insert(menuItemAvailability)
      .values({
        tenantId,
        branchId: effectiveBranchId,
        menuItemId: payload.menuItemId,
        is86ed: payload.is86ed,
        reason: nextReason,
        remainingCount: nextRemaining,
        autoResetAt: payload.is86ed ? autoResetAt : null,
      })
      .returning();

    return inserted;
  });
};

export const bulkUpsertAvailabilityTransaction = async (
  tenantId: number,
  effectiveBranchId: number | null,
  payload: BulkAvailabilityToggleInput,
  autoResetAt: Date | null
) => {
  return await db.transaction(async (tx) => {
    const uniqueIds = Array.from(new Set(payload.menuItemIds));

    // 1. Verify all menu items belong to this tenant
    const ownedItems = await tx
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(and(eq(menuItems.tenantId, tenantId), inArray(menuItems.id, uniqueIds)));

    if (ownedItems.length !== uniqueIds.length) {
      throw new Error(
        'One or more menu items do not exist or do not belong to this tenant.'
      );
    }

    const branchMatch = effectiveBranchId
      ? eq(menuItemAvailability.branchId, effectiveBranchId)
      : isNull(menuItemAvailability.branchId);

    const existingRows = await tx
      .select()
      .from(menuItemAvailability)
      .where(
        and(
          eq(menuItemAvailability.tenantId, tenantId),
          inArray(menuItemAvailability.menuItemId, uniqueIds),
          branchMatch
        )
      );

    const existingByMenuId = new Map(existingRows.map((r) => [r.menuItemId, r]));

    for (const menuItemId of uniqueIds) {
      const existing = existingByMenuId.get(menuItemId);
      const nextRemaining = payload.is86ed ? 0 : null;
      const nextReason = payload.is86ed ? payload.reason ?? null : null;

      if (existing) {
        await tx
          .update(menuItemAvailability)
          .set({
            is86ed: payload.is86ed,
            reason: nextReason,
            remainingCount: nextRemaining,
            autoResetAt: payload.is86ed ? autoResetAt : null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(menuItemAvailability.id, existing.id),
              eq(menuItemAvailability.tenantId, tenantId)
            )
          );
      } else {
        await tx.insert(menuItemAvailability).values({
          tenantId,
          branchId: effectiveBranchId,
          menuItemId,
          is86ed: payload.is86ed,
          reason: nextReason,
          remainingCount: nextRemaining,
          autoResetAt: payload.is86ed ? autoResetAt : null,
        });
      }
    }

    return { updatedCount: uniqueIds.length };
  });
};