// apps/api/src/services/recipe.service.ts
import * as recipeRepo from '../repositories/recipe.repository';
import type { UpsertRecipeInput } from '../validators/recipe.validator';

export const fetchTenantRecipesOverview = async (tenantId: number) => {
  const { allItems, allRecipes, ingredientsWithCost } =
    await recipeRepo.findRecipesContextByTenant(tenantId);

  const ingredientsByRecipeId = new Map<number, typeof ingredientsWithCost>();
  for (const ing of ingredientsWithCost) {
    const list = ingredientsByRecipeId.get(ing.recipeId) ?? [];
    list.push(ing);
    ingredientsByRecipeId.set(ing.recipeId, list);
  }

  // Keep the latest active recipe per menuItemId
  const recipeByMenuId = new Map<number, (typeof allRecipes)[number]>();
  for (const rec of allRecipes) {
    if (!recipeByMenuId.has(rec.menuItemId)) {
      recipeByMenuId.set(rec.menuItemId, rec);
    }
  }

  return allItems.map((item) => {
    const rec = recipeByMenuId.get(item.id) ?? null;
    const retailPrice = parseFloat(item.price) || 0;

    if (!rec) {
      return {
        menuItemId: item.id,
        itemName: item.name,
        sku: item.sku,
        categoryName: item.categoryName || 'Uncategorized',
        stockTrackingType: item.stockTrackingType,
        retailPrice: item.price,
        hasRecipe: false,
        recipe: null,
        cogsPerPortion: 0,
        foodCostPercent: '0.0',
        marginPercent: '0.0',
      };
    }

    const ings = ingredientsByRecipeId.get(rec.id) ?? [];
    const yieldPortions = Math.max(parseFloat(rec.yieldPortions) || 1, 0.01);

    const batchCogs = ings.reduce((sum, cur) => {
      const qty = parseFloat(cur.quantity) || 0;
      const cost = parseFloat(cur.unitCost) || 0;
      const wastage = parseFloat(cur.wastagePercentage) || 0;
      return sum + qty * cost * (1 + wastage / 100);
    }, 0);

    const cogsPerPortion = batchCogs / yieldPortions;
    const foodCostPct = retailPrice > 0 ? (cogsPerPortion / retailPrice) * 100 : 0;
    const marginPct = retailPrice > 0 ? ((retailPrice - cogsPerPortion) / retailPrice) * 100 : 0;

    return {
      menuItemId: item.id,
      itemName: item.name,
      sku: item.sku,
      categoryName: item.categoryName || 'Uncategorized',
      stockTrackingType: item.stockTrackingType,
      retailPrice: item.price,
      hasRecipe: true,
      recipe: {
        id: rec.id,
        version: rec.version,
        prepTimeMinutes: rec.prepTimeMinutes,
        cookTimeMinutes: rec.cookTimeMinutes,
        yieldPortions: rec.yieldPortions,
        instructions: rec.instructions,
        notes: rec.notes,
        batchCogs: Number(batchCogs.toFixed(2)),
        calculatedCogs: Number(cogsPerPortion.toFixed(2)),
        ingredients: ings,
      },
      cogsPerPortion: Number(cogsPerPortion.toFixed(2)),
      foodCostPercent: foodCostPct.toFixed(1),
      marginPercent: marginPct.toFixed(1),
    };
  });
};

export const saveTenantRecipe = async (
  tenantId: number,
  defaultBranchId: number | null,
  payload: UpsertRecipeInput
) => {
  return await recipeRepo.upsertRecipeTransaction(tenantId, defaultBranchId, payload);
};

export const removeTenantRecipe = async (tenantId: number, recipeId: number) => {
  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    throw new Error('Invalid recipe ID');
  }
  return await recipeRepo.deleteRecipeTransaction(tenantId, recipeId);
};