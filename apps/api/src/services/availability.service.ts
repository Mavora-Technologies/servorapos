// apps/api/src/services/availability.service.ts
import * as availabilityRepo from '../repositories/availability.repository';
import type {
  UpdateAvailabilityInput,
  BulkAvailabilityToggleInput,
} from '../validators/availability.validator';

function computeNextMorningReset(): Date {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(6, 0, 0, 0);
  return next;
}

export const fetchTenantAvailabilityOverview = async (
  tenantId: number,
  branchId?: number
) => {
  const {
    items,
    availabilityRows,
    tenantInventory,
    activeRecipes,
    allRecipeIngredients,
  } = await availabilityRepo.findAvailabilityContext(tenantId, branchId);

  const now = new Date();

  // Prefer branch-specific availability row over tenant-wide fallback
  const availByMenuId = new Map<number, (typeof availabilityRows)[number]>();
  for (const row of availabilityRows) {
    const existing = availByMenuId.get(row.menuItemId);
    if (!existing || (branchId && row.branchId === branchId && existing.branchId !== branchId)) {
      availByMenuId.set(row.menuItemId, row);
    }
  }

  const invById = new Map(
    tenantInventory.map((inv) => [
      inv.id,
      { ...inv, stockNum: parseFloat(inv.currentStock) || 0 },
    ])
  );

  const recipeByMenuId = new Map(
    activeRecipes.map((r) => [
      r.menuItemId,
      { recipeId: r.recipeId, yieldPortions: parseFloat(r.yieldPortions) || 1 },
    ])
  );

  const ingredientsByRecipeId = new Map<number, typeof allRecipeIngredients>();
  for (const ing of allRecipeIngredients) {
    const list = ingredientsByRecipeId.get(ing.recipeId) ?? [];
    list.push(ing);
    ingredientsByRecipeId.set(ing.recipeId, list);
  }

  let availableCount = 0;
  let outOfStockCount = 0;
  let lowStockCount = 0;
  let manual86Count = 0;
  let inventoryDepletedCount = 0;

  const formattedItems = items.map((item) => {
    const manual = availByMenuId.get(item.id);
    const autoResetExpired =
      manual?.autoResetAt !== null &&
      manual?.autoResetAt !== undefined &&
      new Date(manual.autoResetAt) <= now;

    const isManually86ed = manual ? manual.is86ed && !autoResetExpired : false;
    const manualRemainingCount =
      manual && !autoResetExpired ? (manual.remainingCount ?? null) : null;

    // Compute live inventory/BOM portion limit
    let inventoryMaxPortions: number | null = null;
    let limitingIngredientName: string | null = null;

    if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
      const inv = invById.get(item.directInventoryItemId);
      if (inv && !inv.allowNegativeStock) {
        inventoryMaxPortions = Math.max(0, Math.floor(inv.stockNum));
        limitingIngredientName = inv.name;
      }
    } else if (
      item.stockTrackingType === 'RECIPE' ||
      item.stockTrackingType === 'COMPOSITE'
    ) {
      const rec = recipeByMenuId.get(item.id);
      if (rec) {
        const ings = ingredientsByRecipeId.get(rec.recipeId) ?? [];
        const yieldPortions = rec.yieldPortions > 0 ? rec.yieldPortions : 1;

        for (const ing of ings) {
          const inv = invById.get(ing.inventoryItemId);
          if (!inv || inv.allowNegativeStock) continue;

          const baseQty = parseFloat(ing.quantity) || 0;
          const wastagePct = parseFloat(ing.wastagePercentage) || 0;
          const requiredPerPortion = (baseQty * (1 + wastagePct / 100)) / yieldPortions;
          if (requiredPerPortion <= 0) continue;

          const possiblePortions = Math.max(0, Math.floor(inv.stockNum / requiredPerPortion));
          if (inventoryMaxPortions === null || possiblePortions < inventoryMaxPortions) {
            inventoryMaxPortions = possiblePortions;
            limitingIngredientName = inv.name;
          }
        }
      }
    }

    let effectiveRemaining: number | null = inventoryMaxPortions;
    if (manualRemainingCount !== null) {
      effectiveRemaining =
        effectiveRemaining === null
          ? Math.max(0, manualRemainingCount)
          : Math.min(effectiveRemaining, Math.max(0, manualRemainingCount));
    }

    const isInventoryDepleted = inventoryMaxPortions !== null && inventoryMaxPortions <= 0;
    const is86ed = isManually86ed || (effectiveRemaining !== null && effectiveRemaining <= 0);

    if (is86ed) {
      outOfStockCount++;
      if (isManually86ed) manual86Count++;
      else if (isInventoryDepleted) inventoryDepletedCount++;
    } else {
      availableCount++;
      if (effectiveRemaining !== null && effectiveRemaining <= 5) {
        lowStockCount++;
      }
    }

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      price: item.price,
      categoryId: item.categoryId,
      categoryName: item.categoryName || 'Uncategorized',
      stockTrackingType: item.stockTrackingType,
      is86ed,
      isManually86ed,
      isInventoryDepleted,
      reason: isManually86ed ? (manual?.reason ?? null) : null,
      remainingCount: manualRemainingCount,
      inventoryMaxPortions,
      effectiveRemaining,
      limitingIngredientName,
      autoResetAt: isManually86ed ? (manual?.autoResetAt ?? null) : null,
    };
  });

  return {
    summary: {
      total: items.length,
      available: availableCount,
      outOfStock: outOfStockCount,
      lowStock: lowStockCount,
      manual86Count,
      inventoryDepletedCount,
    },
    items: formattedItems,
  };
};

export const toggleSingleItemAvailability = async (
  tenantId: number,
  defaultBranchId: number | null,
  payload: UpdateAvailabilityInput
) => {
  const effectiveBranchId =
    payload.branchId !== undefined ? payload.branchId : defaultBranchId;
  const autoResetAt =
    payload.is86ed && payload.autoResetTomorrow ? computeNextMorningReset() : null;

  return await availabilityRepo.upsertItemAvailabilityTransaction(
    tenantId,
    effectiveBranchId,
    payload,
    autoResetAt
  );
};

export const bulkToggleItemAvailability = async (
  tenantId: number,
  defaultBranchId: number | null,
  payload: BulkAvailabilityToggleInput
) => {
  const effectiveBranchId =
    payload.branchId !== undefined ? payload.branchId : defaultBranchId;
  const autoResetAt =
    payload.is86ed && payload.autoResetTomorrow ? computeNextMorningReset() : null;

  return await availabilityRepo.bulkUpsertAvailabilityTransaction(
    tenantId,
    effectiveBranchId,
    payload,
    autoResetAt
  );
};