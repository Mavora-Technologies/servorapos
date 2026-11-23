// apps/api/src/repositories/recipe.repository.ts
import { eq, and, asc, desc, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import {
  recipes,
  recipeIngredients,
  menuItems,
  menuCategories,
  inventoryItems,
} from '../config/schema';
import type { UpsertRecipeInput } from '../validators/recipe.validator';

export const findRecipesContextByTenant = async (tenantId: number) => {
  const [allItems, allRecipes] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        sku: menuItems.sku,
        price: menuItems.price,
        costEstimate: menuItems.costEstimate,
        stockTrackingType: menuItems.stockTrackingType,
        categoryId: menuItems.categoryId,
        categoryName: menuCategories.name,
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
      .select()
      .from(recipes)
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.isActive, true)))
      .orderBy(desc(recipes.updatedAt)),
  ]);

  const recipeIds = allRecipes.map((r) => r.id);

  const ingredientsWithCost =
    recipeIds.length > 0
      ? await db
          .select({
            id: recipeIngredients.id,
            recipeId: recipeIngredients.recipeId,
            inventoryItemId: recipeIngredients.inventoryItemId,
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            wastagePercentage: recipeIngredients.wastagePercentage,
            ingredientName: inventoryItems.name,
            ingredientSku: inventoryItems.sku,
            inventoryBaseUnit: inventoryItems.unit,
            unitCost: inventoryItems.costPrice,
            currentStock: inventoryItems.currentStock,
          })
          .from(recipeIngredients)
          .innerJoin(
            inventoryItems,
            and(
              eq(recipeIngredients.inventoryItemId, inventoryItems.id),
              eq(inventoryItems.tenantId, tenantId)
            )
          )
          .where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              inArray(recipeIngredients.recipeId, recipeIds)
            )
          )
          .orderBy(asc(recipeIngredients.id))
      : [];

  return { allItems, allRecipes, ingredientsWithCost };
};

export const upsertRecipeTransaction = async (
  tenantId: number,
  defaultBranchId: number | null,
  payload: UpsertRecipeInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Verify menu item belongs to authenticated tenant
    const [menuItem] = await tx
      .select({
        id: menuItems.id,
        name: menuItems.name,
        stockTrackingType: menuItems.stockTrackingType,
      })
      .from(menuItems)
      .where(and(eq(menuItems.id, payload.menuItemId), eq(menuItems.tenantId, tenantId)))
      .limit(1);

    if (!menuItem) {
      throw new Error('Selected menu item does not exist or does not belong to this tenant.');
    }

    // 2. Merge duplicate inventoryItemId lines cleanly
    const mergedByInvId = new Map<
      number,
      { quantity: number; unit: string; wastagePercentage: number }
    >();
    for (const ing of payload.ingredients) {
      const prev = mergedByInvId.get(ing.inventoryItemId);
      if (prev) {
        prev.quantity += ing.quantity;
        prev.wastagePercentage = Math.max(prev.wastagePercentage, ing.wastagePercentage);
      } else {
        mergedByInvId.set(ing.inventoryItemId, {
          quantity: ing.quantity,
          unit: ing.unit,
          wastagePercentage: ing.wastagePercentage,
        });
      }
    }

    // 3. Verify all referenced raw materials belong to this tenant & fetch authoritative unit costs
    const uniqueInvIds = Array.from(mergedByInvId.keys());
    const matchedInventory = await tx
      .select({
        id: inventoryItems.id,
        unit: inventoryItems.unit,
        costPrice: inventoryItems.costPrice,
      })
      .from(inventoryItems)
      .where(
        and(eq(inventoryItems.tenantId, tenantId), inArray(inventoryItems.id, uniqueInvIds))
      );

    if (matchedInventory.length !== uniqueInvIds.length) {
      throw new Error(
        'One or more selected raw materials do not exist or do not belong to this tenant.'
      );
    }

    const invById = new Map(matchedInventory.map((inv) => [inv.id, inv]));

    // 4. Compute authoritative batch & per-portion COGS from live inventory ledger costs
    let batchCost = 0;
    const ingredientInserts = Array.from(mergedByInvId.entries()).map(
      ([inventoryItemId, line]) => {
        const inv = invById.get(inventoryItemId)!;
        const unitCost = parseFloat(inv.costPrice) || 0;
        const wastageFactor = 1 + (line.wastagePercentage || 0) / 100;
        batchCost += line.quantity * unitCost * wastageFactor;

        return {
          tenantId,
          inventoryItemId,
          quantity: line.quantity.toFixed(4),
          unit: line.unit || inv.unit,
          wastagePercentage: (line.wastagePercentage || 0).toFixed(2),
        };
      }
    );

    const yieldPortions = Math.max(payload.yieldPortions, 0.01);
    const cogsPerPortion = batchCost / yieldPortions;

    // 5. Upsert tenant-scoped active recipe header (incrementing version on update)
    const [existing] = await tx
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.tenantId, tenantId),
          eq(recipes.menuItemId, payload.menuItemId),
          eq(recipes.isActive, true)
        )
      )
      .limit(1);

    let savedRecipe;
    if (existing) {
      const [updated] = await tx
        .update(recipes)
        .set({
          version: existing.version + 1,
          prepTimeMinutes: payload.prepTimeMinutes,
          cookTimeMinutes: payload.cookTimeMinutes,
          yieldPortions: yieldPortions.toFixed(2),
          instructions: payload.instructions ?? null,
          notes: payload.notes ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(recipes.id, existing.id), eq(recipes.tenantId, tenantId)))
        .returning();

      savedRecipe = updated;

      await tx
        .delete(recipeIngredients)
        .where(
          and(
            eq(recipeIngredients.recipeId, existing.id),
            eq(recipeIngredients.tenantId, tenantId)
          )
        );
    } else {
      const [inserted] = await tx
        .insert(recipes)
        .values({
          tenantId,
          branchId: payload.branchId !== undefined ? payload.branchId : defaultBranchId,
          menuItemId: payload.menuItemId,
          version: 1,
          prepTimeMinutes: payload.prepTimeMinutes,
          cookTimeMinutes: payload.cookTimeMinutes,
          yieldPortions: yieldPortions.toFixed(2),
          instructions: payload.instructions ?? null,
          notes: payload.notes ?? null,
          isActive: true,
        })
        .returning();

      savedRecipe = inserted;
    }

    await tx.insert(recipeIngredients).values(
      ingredientInserts.map((row) => ({
        ...row,
        recipeId: savedRecipe.id,
      }))
    );

    // 6. Synchronize menu_items.costEstimate so POS COGS & margins stay authoritative
    await tx
      .update(menuItems)
      .set({
        costEstimate: cogsPerPortion.toFixed(2),
        updatedAt: new Date(),
      })
      .where(and(eq(menuItems.id, payload.menuItemId), eq(menuItems.tenantId, tenantId)));

    return {
      recipeId: savedRecipe.id,
      version: savedRecipe.version,
      batchCost: Number(batchCost.toFixed(2)),
      cogsPerPortion: Number(cogsPerPortion.toFixed(2)),
    };
  });
};

export const deleteRecipeTransaction = async (tenantId: number, recipeId: number) => {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(recipes)
      .where(and(eq(recipes.id, recipeId), eq(recipes.tenantId, tenantId)))
      .returning({ id: recipes.id, menuItemId: recipes.menuItemId });

    if (!deleted) {
      return null;
    }

    await tx
      .update(menuItems)
      .set({ costEstimate: '0.00', updatedAt: new Date() })
      .where(
        and(
          eq(menuItems.id, deleted.menuItemId),
          eq(menuItems.tenantId, tenantId),
          eq(menuItems.stockTrackingType, 'RECIPE')
        )
      );

    return deleted;
  });
};