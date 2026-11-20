// apps/api/src/repositories/menu.repository.ts
import { eq, and, or, isNull, asc, ne, inArray, ilike, sql } from 'drizzle-orm';
import { db } from '../config/db';
import {
  menuCategories,
  menuItems,
  inventoryItems,
  recipes,
  recipeIngredients,
} from '../config/schema';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateMenuItemInput,
  UpdateMenuItemInput,
  RecipeIngredientInput,
} from '../validators/menu.validator';

export interface LinkedIngredientDTO {
  id: number;
  inventoryItemId: number;
  inventoryItemName: string;
  inventoryItemSku: string | null;
  quantity: string;
  unit: string;
  wastagePercentage: string;
  unitCost: string;
}

export const createCategory = async (tenantId: number, data: CreateCategoryInput) => {
  const [duplicate] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.tenantId, tenantId), ilike(menuCategories.name, data.name)))
    .limit(1);

  if (duplicate) {
    throw new Error(`Category "${data.name}" already exists for this tenant.`);
  }

  const [category] = await db
    .insert(menuCategories)
    .values({
      tenantId,
      branchId: data.branchId ?? null,
      name: data.name,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
    })
    .returning();
  return category;
};

export const updateCategoryRecord = async (
  tenantId: number,
  categoryId: number,
  data: UpdateCategoryInput
) => {
  const [existing] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.tenantId, tenantId)))
    .limit(1);

  if (!existing) return null;

  if (data.name !== undefined) {
    const [duplicate] = await db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(
        and(
          eq(menuCategories.tenantId, tenantId),
          ilike(menuCategories.name, data.name),
          ne(menuCategories.id, categoryId)
        )
      )
      .limit(1);

    if (duplicate) {
      throw new Error(`Another category named "${data.name}" already exists.`);
    }
  }

  const updateFields: Partial<typeof menuCategories.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateFields.name = data.name;
  if (data.description !== undefined) updateFields.description = data.description;
  if (data.sortOrder !== undefined) updateFields.sortOrder = data.sortOrder;
  if (data.isActive !== undefined) updateFields.isActive = data.isActive;
  if (data.branchId !== undefined) updateFields.branchId = data.branchId;

  const [updated] = await db
    .update(menuCategories)
    .set(updateFields)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.tenantId, tenantId)))
    .returning();

  return updated ?? null;
};

export const deleteCategoryRecord = async (tenantId: number, categoryId: number) => {
  const [linkedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(menuItems)
    .where(and(eq(menuItems.tenantId, tenantId), eq(menuItems.categoryId, categoryId)));

  if ((linkedCount?.count ?? 0) > 0) {
    const err = new Error(
      `Cannot delete category: ${linkedCount.count} menu item(s) are still assigned to it. Reassign those items or mark the category Inactive instead.`
    ) as Error & { statusCode?: number };
    err.statusCode = 409;
    throw err;
  }

  const [deleted] = await db
    .delete(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.tenantId, tenantId)))
    .returning({ id: menuCategories.id });

  return deleted ?? null;
};

export const getCategories = async (
  tenantId: number,
  branchId?: number,
  includeInactive = false
) => {
  const conditions = [eq(menuCategories.tenantId, tenantId)];
  if (!includeInactive) {
    conditions.push(eq(menuCategories.isActive, true));
  }
  if (branchId) {
    conditions.push(
      or(eq(menuCategories.branchId, branchId), isNull(menuCategories.branchId))!
    );
  }

  return await db
    .select()
    .from(menuCategories)
    .where(and(...conditions))
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
};

export const getActiveMenu = async (tenantId: number, branchId?: number) => {
  const categoryFilter = branchId
    ? and(
        eq(menuCategories.tenantId, tenantId),
        eq(menuCategories.isActive, true),
        or(eq(menuCategories.branchId, branchId), isNull(menuCategories.branchId))
      )
    : and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.isActive, true));

  const itemFilter = branchId
    ? and(
        eq(menuItems.tenantId, tenantId),
        eq(menuItems.isAvailable, true),
        or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId))
      )
    : and(eq(menuItems.tenantId, tenantId), eq(menuItems.isAvailable, true));

  const [categories, items] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(categoryFilter)
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name)),
    db
      .select()
      .from(menuItems)
      .where(itemFilter)
      .orderBy(asc(menuItems.name)),
  ]);

  return { categories, items };
};

export const getMenuCatalogWithLinks = async (tenantId: number, branchId?: number) => {
  const categoryFilter = branchId
    ? and(
        eq(menuCategories.tenantId, tenantId),
        eq(menuCategories.isActive, true),
        or(eq(menuCategories.branchId, branchId), isNull(menuCategories.branchId))
      )
    : and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.isActive, true));

  const itemFilter = branchId
    ? and(
        eq(menuItems.tenantId, tenantId),
        or(eq(menuItems.branchId, branchId), isNull(menuItems.branchId))
      )
    : eq(menuItems.tenantId, tenantId);

  const [categories, rows, activeRecipes] = await Promise.all([
    db
      .select()
      .from(menuCategories)
      .where(categoryFilter)
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name)),
    db
      .select({
        item: menuItems,
        categoryName: menuCategories.name,
        directInventoryName: inventoryItems.name,
        directInventorySku: inventoryItems.sku,
        directInventoryUnit: inventoryItems.unit,
        directInventoryCost: inventoryItems.costPrice,
        directInventoryStock: inventoryItems.currentStock,
      })
      .from(menuItems)
      .innerJoin(
        menuCategories,
        and(eq(menuItems.categoryId, menuCategories.id), eq(menuCategories.tenantId, tenantId))
      )
      .leftJoin(
        inventoryItems,
        and(
          eq(menuItems.directInventoryItemId, inventoryItems.id),
          eq(inventoryItems.tenantId, tenantId)
        )
      )
      .where(itemFilter)
      .orderBy(asc(menuItems.name)),
    db
      .select({
        recipeId: recipes.id,
        menuItemId: recipes.menuItemId,
      })
      .from(recipes)
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.isActive, true))),
  ]);

  const recipeIds = activeRecipes.map((r) => r.recipeId);
  const ingredientsByMenuItemId = new Map<number, LinkedIngredientDTO[]>();

  if (recipeIds.length > 0) {
    const recipeToMenuItem = new Map<number, number>();
    activeRecipes.forEach((r) => recipeToMenuItem.set(r.recipeId, r.menuItemId));

    const ingredientRows = await db
      .select({
        id: recipeIngredients.id,
        recipeId: recipeIngredients.recipeId,
        inventoryItemId: recipeIngredients.inventoryItemId,
        inventoryItemName: inventoryItems.name,
        inventoryItemSku: inventoryItems.sku,
        quantity: recipeIngredients.quantity,
        unit: recipeIngredients.unit,
        wastagePercentage: recipeIngredients.wastagePercentage,
        unitCost: inventoryItems.costPrice,
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
      );

    for (const ing of ingredientRows) {
      const menuItemId = recipeToMenuItem.get(ing.recipeId);
      if (!menuItemId) continue;
      const list = ingredientsByMenuItemId.get(menuItemId) ?? [];
      list.push({
        id: ing.id,
        inventoryItemId: ing.inventoryItemId,
        inventoryItemName: ing.inventoryItemName,
        inventoryItemSku: ing.inventoryItemSku,
        quantity: ing.quantity,
        unit: ing.unit,
        wastagePercentage: ing.wastagePercentage,
        unitCost: ing.unitCost,
      });
      ingredientsByMenuItemId.set(menuItemId, list);
    }
  }

  const items = rows.map((row) => ({
    id: row.item.id,
    categoryId: row.item.categoryId,
    category: row.categoryName,
    branchId: row.item.branchId,
    name: row.item.name,
    sku: row.item.sku,
    description: row.item.description,
    price: parseFloat(row.item.price),
    costEstimate: parseFloat(row.item.costEstimate),
    stockTrackingType: row.item.stockTrackingType,
    directInventoryItemId: row.item.directInventoryItemId,
    directInventoryItem: row.item.directInventoryItemId
      ? {
          id: row.item.directInventoryItemId,
          name: row.directInventoryName ?? 'Unknown Item',
          sku: row.directInventorySku ?? null,
          unit: row.directInventoryUnit ?? '',
          costPrice: row.directInventoryCost ?? '0.0000',
          currentStock: row.directInventoryStock ?? '0.0000',
        }
      : null,
    recipeIngredients: ingredientsByMenuItemId.get(row.item.id) ?? [],
    kitchenStation: row.item.kitchenStation,
    prepTimeMinutes: row.item.prepTimeMinutes,
    taxRate: parseFloat(row.item.taxRate),
    cateringLevyRate: parseFloat(row.item.cateringLevyRate),
    isTaxInclusive: row.item.isTaxInclusive,
    isAvailable: row.item.isAvailable,
    imageUrl: row.item.imageUrl,
  }));

  return { categories, items };
};

export const createMenuItemTransaction = async (
  tenantId: number,
  data: CreateMenuItemInput
) => {
  return await db.transaction(async (tx) => {
    // 1. Verify category belongs to authenticated tenant
    const [category] = await tx
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(
        and(eq(menuCategories.id, data.categoryId), eq(menuCategories.tenantId, tenantId))
      );

    if (!category) {
      throw new Error('Selected menu category does not belong to this tenant.');
    }

    // 2. Verify SKU uniqueness within tenant if provided
    if (data.sku) {
      const [dupSku] = await tx
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(and(eq(menuItems.tenantId, tenantId), eq(menuItems.sku, data.sku)));
      if (dupSku) {
        throw new Error(`SKU "${data.sku}" is already assigned to another menu item.`);
      }
    }

    // 3. Validate direct inventory link or recipe raw materials
    let resolvedDirectInvId: number | null = null;
    let computedCost = data.costEstimate ?? 0;

    if (data.stockTrackingType === 'STOCKED_PRODUCT' && data.directInventoryItemId) {
      const [invItem] = await tx
        .select({ id: inventoryItems.id, costPrice: inventoryItems.costPrice })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, data.directInventoryItemId),
            eq(inventoryItems.tenantId, tenantId)
          )
        );
      if (!invItem) {
        throw new Error('Linked stocked product does not exist or belongs to another tenant.');
      }
      resolvedDirectInvId = invItem.id;
      if (data.costEstimate === undefined) {
        computedCost = parseFloat(invItem.costPrice) || 0;
      }
    }

    const recipeLines: RecipeIngredientInput[] =
      (data.stockTrackingType === 'RECIPE' || data.stockTrackingType === 'COMPOSITE') &&
      Array.isArray(data.recipeIngredients)
        ? data.recipeIngredients
        : [];

    if (recipeLines.length > 0) {
      const uniqueInvIds = Array.from(new Set(recipeLines.map((l) => l.inventoryItemId)));
      const matchedInv = await tx
        .select({ id: inventoryItems.id, costPrice: inventoryItems.costPrice })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.tenantId, tenantId),
            inArray(inventoryItems.id, uniqueInvIds)
          )
        );

      if (matchedInv.length !== uniqueInvIds.length) {
        throw new Error(
          'One or more linked raw materials are invalid or do not belong to this tenant.'
        );
      }

      const costById = new Map<number, number>(
        matchedInv.map((m) => [m.id, parseFloat(m.costPrice) || 0])
      );
      computedCost = recipeLines.reduce((sum, line) => {
        const unitCost = costById.get(line.inventoryItemId) ?? 0;
        const wastageFactor = 1 + (line.wastagePercentage || 0) / 100;
        return sum + line.quantity * unitCost * wastageFactor;
      }, 0);
    }

    // 4. Insert Menu Item
    const [createdItem] = await tx
      .insert(menuItems)
      .values({
        tenantId,
        branchId: data.branchId ?? null,
        categoryId: data.categoryId,
        name: data.name,
        sku: data.sku ?? null,
        description: data.description ?? null,
        price: data.price.toFixed(2),
        costEstimate: computedCost.toFixed(2),
        stockTrackingType: data.stockTrackingType,
        directInventoryItemId: resolvedDirectInvId,
        kitchenStation: data.kitchenStation,
        prepTimeMinutes: data.prepTimeMinutes,
        taxRate: data.taxRate.toFixed(2),
        cateringLevyRate: data.cateringLevyRate.toFixed(2),
        isTaxInclusive: data.isTaxInclusive,
        isAvailable: data.isAvailable,
        imageUrl: data.imageUrl ?? null,
      })
      .returning();

    // 5. Persist Recipe BOM lines if provided
    if (recipeLines.length > 0) {
      const [createdRecipe] = await tx
        .insert(recipes)
        .values({
          tenantId,
          branchId: data.branchId ?? null,
          menuItemId: createdItem.id,
          version: 1,
          prepTimeMinutes: data.prepTimeMinutes,
          cookTimeMinutes: 10,
          yieldPortions: '1.00',
          isActive: true,
        })
        .returning();

      await tx.insert(recipeIngredients).values(
        recipeLines.map((line) => ({
          tenantId,
          recipeId: createdRecipe.id,
          inventoryItemId: line.inventoryItemId,
          quantity: line.quantity.toFixed(4),
          unit: line.unit,
          wastagePercentage: (line.wastagePercentage ?? 0).toFixed(2),
        }))
      );
    }

    return createdItem;
  });
};

export const updateMenuItemTransaction = async (
  tenantId: number,
  itemId: number,
  data: UpdateMenuItemInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;

    if (data.categoryId !== undefined) {
      const [cat] = await tx
        .select({ id: menuCategories.id })
        .from(menuCategories)
        .where(
          and(eq(menuCategories.id, data.categoryId), eq(menuCategories.tenantId, tenantId))
        );
      if (!cat) {
        throw new Error('Selected menu category does not belong to this tenant.');
      }
    }

    if (data.sku) {
      const [dupSku] = await tx
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(
          and(
            eq(menuItems.tenantId, tenantId),
            eq(menuItems.sku, data.sku),
            ne(menuItems.id, itemId)
          )
        );
      if (dupSku) {
        throw new Error(`SKU "${data.sku}" is already assigned to another menu item.`);
      }
    }

    const nextTrackingType = data.stockTrackingType ?? existing.stockTrackingType;
    const updateFields: Partial<typeof menuItems.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.categoryId !== undefined) updateFields.categoryId = data.categoryId;
    if (data.branchId !== undefined) updateFields.branchId = data.branchId;
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.sku !== undefined) updateFields.sku = data.sku;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.price !== undefined) updateFields.price = data.price.toFixed(2);
    if (data.costEstimate !== undefined) updateFields.costEstimate = data.costEstimate.toFixed(2);
    if (data.stockTrackingType !== undefined) {
      updateFields.stockTrackingType = data.stockTrackingType;
    }
    if (data.kitchenStation !== undefined) updateFields.kitchenStation = data.kitchenStation;
    if (data.prepTimeMinutes !== undefined) updateFields.prepTimeMinutes = data.prepTimeMinutes;
    if (data.taxRate !== undefined) updateFields.taxRate = data.taxRate.toFixed(2);
    if (data.cateringLevyRate !== undefined) {
      updateFields.cateringLevyRate = data.cateringLevyRate.toFixed(2);
    }
    if (data.isTaxInclusive !== undefined) updateFields.isTaxInclusive = data.isTaxInclusive;
    if (data.isAvailable !== undefined) updateFields.isAvailable = data.isAvailable;
    if (data.imageUrl !== undefined) updateFields.imageUrl = data.imageUrl;

    // Handle STOCKED_PRODUCT direct inventory link
    if (nextTrackingType === 'STOCKED_PRODUCT') {
      const targetInvId =
        data.directInventoryItemId !== undefined
          ? data.directInventoryItemId
          : existing.directInventoryItemId;

      if (!targetInvId) {
        throw new Error('A stocked inventory product must be linked for STOCKED_PRODUCT items.');
      }

      const [invItem] = await tx
        .select({ id: inventoryItems.id, costPrice: inventoryItems.costPrice })
        .from(inventoryItems)
        .where(and(eq(inventoryItems.id, targetInvId), eq(inventoryItems.tenantId, tenantId)));

      if (!invItem) {
        throw new Error('Linked stocked product does not exist or belongs to another tenant.');
      }

      updateFields.directInventoryItemId = invItem.id;
      if (data.costEstimate === undefined) {
        updateFields.costEstimate = (parseFloat(invItem.costPrice) || 0).toFixed(2);
      }
    } else {
      updateFields.directInventoryItemId = null;
    }

    // Handle RECIPE / COMPOSITE BOM updates
    if (
      (nextTrackingType === 'RECIPE' || nextTrackingType === 'COMPOSITE') &&
      data.recipeIngredients !== undefined
    ) {
      const recipeLines = data.recipeIngredients;
      let calculatedRecipeCost = 0;

      if (recipeLines.length > 0) {
        const uniqueInvIds = Array.from(new Set(recipeLines.map((l) => l.inventoryItemId)));
        const matchedInv = await tx
          .select({ id: inventoryItems.id, costPrice: inventoryItems.costPrice })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.tenantId, tenantId),
              inArray(inventoryItems.id, uniqueInvIds)
            )
          );

        if (matchedInv.length !== uniqueInvIds.length) {
          throw new Error(
            'One or more linked raw materials are invalid or do not belong to this tenant.'
          );
        }

        const costById = new Map<number, number>(
          matchedInv.map((m) => [m.id, parseFloat(m.costPrice) || 0])
        );
        calculatedRecipeCost = recipeLines.reduce((sum, line) => {
          const unitCost = costById.get(line.inventoryItemId) ?? 0;
          const wastageFactor = 1 + (line.wastagePercentage || 0) / 100;
          return sum + line.quantity * unitCost * wastageFactor;
        }, 0);
      }

      updateFields.costEstimate = calculatedRecipeCost.toFixed(2);

      // Find or create active recipe header
      const [existingRecipe] = await tx
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.tenantId, tenantId),
            eq(recipes.menuItemId, itemId),
            eq(recipes.isActive, true)
          )
        )
        .limit(1);

      let recipeId = existingRecipe?.id;

      if (!recipeId && recipeLines.length > 0) {
        const [newRecipe] = await tx
          .insert(recipes)
          .values({
            tenantId,
            branchId: existing.branchId,
            menuItemId: itemId,
            version: 1,
            prepTimeMinutes: data.prepTimeMinutes ?? existing.prepTimeMinutes,
            cookTimeMinutes: 10,
            yieldPortions: '1.00',
            isActive: true,
          })
          .returning();
        recipeId = newRecipe.id;
      }

      if (recipeId) {
        await tx
          .delete(recipeIngredients)
          .where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              eq(recipeIngredients.recipeId, recipeId)
            )
          );

        if (recipeLines.length > 0) {
          await tx.insert(recipeIngredients).values(
            recipeLines.map((line) => ({
              tenantId,
              recipeId,
              inventoryItemId: line.inventoryItemId,
              quantity: line.quantity.toFixed(4),
              unit: line.unit,
              wastagePercentage: (line.wastagePercentage ?? 0).toFixed(2),
            }))
          );
        }
      }
    }

    const [updated] = await tx
      .update(menuItems)
      .set(updateFields)
      .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  });
};

export const deleteMenuItemRecord = async (tenantId: number, itemId: number) => {
  const [deleted] = await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.tenantId, tenantId)))
    .returning({ id: menuItems.id });
  return deleted ?? null;
};