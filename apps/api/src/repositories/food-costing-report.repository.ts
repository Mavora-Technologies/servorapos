import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  menuItems,
  menuCategories,
  recipes,
  recipeIngredients,
  inventoryItems,
  orderItems,
  orders,
  branches,
} from '../config/schema';
import { FoodCostingReportQuery } from '../validators/food-costing-report.validator';

const parseDateRange = (startDateStr?: string, endDateStr?: string) => {
  let start: Date;
  if (startDateStr) {
    start = new Date(startDateStr);
    if (!startDateStr.includes('T')) {
      start.setHours(0, 0, 0, 0);
    }
  } else {
    start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
  }

  let end: Date;
  if (endDateStr) {
    end = new Date(endDateStr);
    if (!endDateStr.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getFoodCostingReportMetrics = async (tenantId: number, query: FoodCostingReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  // 1. Fetch all Menu Items that possess an active BOM recipe
  const itemConditions = [
    eq(menuItems.tenantId, tenantId),
    eq(menuItems.isAvailable, true),
    query.branchId ? eq(menuItems.branchId, query.branchId) : undefined,
    query.categoryId ? eq(menuItems.categoryId, query.categoryId) : undefined,
    query.kitchenStation ? eq(menuItems.kitchenStation, query.kitchenStation) : undefined,
    query.search
      ? or(ilike(menuItems.name, `%${query.search}%`), ilike(menuItems.sku, `%${query.search}%`))
      : undefined,
  ].filter(Boolean);

  const rawMenuItems = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      sku: menuItems.sku,
      categoryName: sql<string>`coalesce(${menuCategories.name}, 'General Menu')`,
      sellingPrice: menuItems.price,
      kitchenStation: menuItems.kitchenStation,
      recipeId: recipes.id,
      recipeVersion: recipes.version,
      yieldPortions: recipes.yieldPortions,
      recipeNotes: recipes.notes,
    })
    .from(menuItems)
    .innerJoin(recipes, and(eq(recipes.menuItemId, menuItems.id), eq(recipes.isActive, true)))
    .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(and(...itemConditions));

  if (rawMenuItems.length === 0) {
    return {
      summary: {
        totalCostedRecipes: 0,
        avgFoodCostPercent: 0,
        optimalRecipesCount: 0,
        warningRecipesCount: 0,
        criticalHighCostCount: 0,
        potentialMarginSavings: 0,
      },
      items: [],
      categoryCostSummary: [],
      highImpactIngredients: [],
      pagination: { page: 1, limit: query.limit || 25, total: 0, totalPages: 1 },
    };
  }

  const recipeIds = rawMenuItems.map((r) => r.recipeId);

  // 2. Fetch all raw ingredients for these recipes with their live inventory costs
  const ingredientsData = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      inventoryItemId: recipeIngredients.inventoryItemId,
      ingredientName: inventoryItems.name,
      quantityRequired: recipeIngredients.quantity,
      recipeUnit: recipeIngredients.unit,
      wastagePercentage: recipeIngredients.wastagePercentage,
      currentCostPrice: inventoryItems.costPrice,
      inventoryUnit: inventoryItems.unit,
    })
    .from(recipeIngredients)
    .innerJoin(inventoryItems, eq(recipeIngredients.inventoryItemId, inventoryItems.id))
    .where(and(eq(recipeIngredients.tenantId, tenantId), sql`${recipeIngredients.recipeId} in ${recipeIds}`));

  // 3. Fetch sales volume for these items during the selected period
  const salesQuantities = await db
    .select({
      menuItemId: orderItems.menuItemId,
      unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::numeric`,
      totalRevenue: sql<number>`coalesce(sum(${orderItems.totalPrice}), 0)::numeric`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`lower(${orders.status}) not in ('cancelled', 'voided', 'draft')`,
        query.branchId ? eq(orders.branchId, query.branchId) : undefined
      )
    )
    .groupBy(orderItems.menuItemId);

  const salesMap = new Map(salesQuantities.map((s) => [s.menuItemId, { unitsSold: Number(s.unitsSold), revenue: Number(s.totalRevenue) }]));

  // Group ingredients by recipeId
  const ingredientsByRecipe = new Map<number, typeof ingredientsData>();
  const ingredientImpactMap = new Map<number, { name: string; unit: string; totalUsageCost: number; recipeCount: number }>();

  ingredientsData.forEach((ing) => {
    const list = ingredientsByRecipe.get(ing.recipeId) || [];
    list.push(ing);
    ingredientsByRecipe.set(ing.recipeId, list);

    const costPerItem = Number(ing.quantityRequired) * Number(ing.currentCostPrice) * (1 + Number(ing.wastagePercentage || 0) / 100);
    const existing = ingredientImpactMap.get(ing.inventoryItemId) || {
      name: ing.ingredientName,
      unit: ing.inventoryUnit,
      totalUsageCost: 0,
      recipeCount: 0,
    };
    existing.totalUsageCost += costPerItem;
    existing.recipeCount += 1;
    ingredientImpactMap.set(ing.inventoryItemId, existing);
  });

  // 4. Calculate live theoretical cost and margin ratios for each recipe
  let totalCostSum = 0;
  let totalRevenueSum = 0;
  let optimalCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  const costedRecipes = rawMenuItems.map((item) => {
    const ings = ingredientsByRecipe.get(item.recipeId) || [];
    const yieldPortions = Math.max(Number(item.yieldPortions) || 1, 0.001);

    const rawBatchCost = ings.reduce((sum, ing) => {
      const wastageMult = 1 + Number(ing.wastagePercentage || 0) / 100;
      return sum + Number(ing.quantityRequired) * Number(ing.currentCostPrice) * wastageMult;
    }, 0);

    const theoreticalPortionCost = Math.round((rawBatchCost / yieldPortions) * 100) / 100;
    const price = Number(item.sellingPrice) || 0;
    const grossProfit = price - theoreticalPortionCost;
    const foodCostPercent = price > 0 ? Math.round((theoreticalPortionCost / price) * 1000) / 10 : 0;
    const grossMarginPercent = price > 0 ? Math.round((grossProfit / price) * 1000) / 10 : 0;

    let costHealth: 'OPTIMAL' | 'WARNING' | 'CRITICAL_HIGH_COST' = 'OPTIMAL';
    if (foodCostPercent > 35) {
      costHealth = 'CRITICAL_HIGH_COST';
      criticalCount++;
    } else if (foodCostPercent >= 28) {
      costHealth = 'WARNING';
      warningCount++;
    } else {
      optimalCount++;
    }

    const sales = salesMap.get(item.id) || { unitsSold: 0, revenue: 0 };
    totalCostSum += theoreticalPortionCost * sales.unitsSold;
    totalRevenueSum += sales.revenue;

    return {
      menuItemId: item.id,
      name: item.name,
      sku: item.sku || 'N/A',
      categoryName: item.categoryName,
      kitchenStation: item.kitchenStation,
      sellingPrice: price,
      theoreticalPortionCost,
      grossProfit,
      foodCostPercent,
      grossMarginPercent,
      yieldPortions,
      ingredientCount: ings.length,
      costHealth,
      unitsSoldPeriod: sales.unitsSold,
      totalCostOfSalesPeriod: Math.round(theoreticalPortionCost * sales.unitsSold * 100) / 100,
      totalRevenuePeriod: Math.round(sales.revenue * 100) / 100,
    };
  });

  // Filter by health status if set
  const filteredRecipes = costedRecipes.filter((r) => {
    if (query.costHealthStatus === 'ALL') return true;
    return r.costHealth === query.costHealthStatus;
  });

  // Sort
  filteredRecipes.sort((a, b) => {
    let diff = 0;
    if (query.sortBy === 'FOOD_COST_PERCENT') diff = b.foodCostPercent - a.foodCostPercent;
    else if (query.sortBy === 'THEORETICAL_COST') diff = b.theoreticalPortionCost - a.theoreticalPortionCost;
    else if (query.sortBy === 'RECIPE_PROFIT') diff = b.grossProfit - a.grossProfit;
    else if (query.sortBy === 'NAME') return a.name.localeCompare(b.name);
    return query.sortOrder === 'ASC' ? -diff : diff;
  });

  const page = query.page || 1;
  const limit = query.limit || 25;
  const paginatedItems = filteredRecipes.slice((page - 1) * limit, page * limit);

  // Category Cost Summary
  const catSummaryMap = new Map<string, { category: string; totalRevenue: number; totalCost: number; recipeCount: number }>();
  costedRecipes.forEach((r) => {
    const existing = catSummaryMap.get(r.categoryName) || {
      category: r.categoryName,
      totalRevenue: 0,
      totalCost: 0,
      recipeCount: 0,
    };
    existing.totalRevenue += r.sellingPrice;
    existing.totalCost += r.theoreticalPortionCost;
    existing.recipeCount += 1;
    catSummaryMap.set(r.categoryName, existing);
  });

  const categoryCostSummary = Array.from(catSummaryMap.values()).map((c) => ({
    category: c.category,
    recipeCount: c.recipeCount,
    avgPortionPrice: Math.round((c.totalRevenue / c.recipeCount) * 100) / 100,
    avgPortionCost: Math.round((c.totalCost / c.recipeCount) * 100) / 100,
    categoryFoodCostPercent: c.totalRevenue > 0 ? Math.round((c.totalCost / c.totalRevenue) * 1000) / 10 : 0,
  })).sort((a, b) => b.categoryFoodCostPercent - a.categoryFoodCostPercent);

  // Top 5 High-Impact Ingredients (inflation risk)
  const highImpactIngredients = Array.from(ingredientImpactMap.values())
    .sort((a, b) => b.totalUsageCost - a.totalUsageCost)
    .slice(0, 5)
    .map((ing) => ({
      ...ing,
      totalUsageCost: Math.round(ing.totalUsageCost * 100) / 100,
    }));

  const avgFoodCostPercent = totalRevenueSum > 0
    ? Math.round((totalCostSum / totalRevenueSum) * 1000) / 10
    : costedRecipes.length > 0
    ? Math.round((costedRecipes.reduce((s, r) => s + r.foodCostPercent, 0) / costedRecipes.length) * 10) / 10
    : 0;

  return {
    summary: {
      totalCostedRecipes: costedRecipes.length,
      avgFoodCostPercent,
      optimalRecipesCount: optimalCount,
      warningRecipesCount: warningCount,
      criticalHighCostCount: criticalCount,
      potentialMarginSavings: Math.round(criticalCount * 12500), // Estimated optimization savings
    },
    items: paginatedItems,
    categoryCostSummary,
    highImpactIngredients,
    pagination: {
      page,
      limit,
      total: filteredRecipes.length,
      totalPages: Math.ceil(filteredRecipes.length / limit) || 1,
    },
  };
};

export const getExportableFoodCostingReport = async (tenantId: number, query: FoodCostingReportQuery) => {
  return await getFoodCostingReportMetrics(tenantId, { ...query, limit: 1000, page: 1 });
};