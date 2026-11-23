// apps/api/src/repositories/recipe-costing.repository.ts
import { eq, and, asc, desc, inArray, gte, notInArray, sql } from 'drizzle-orm';
import { db } from '../config/db';
import {
  recipes,
  recipeIngredients,
  menuItems,
  inventoryItems,
  menuCategories,
  orders,
  orderItems,
} from '../config/schema';

export const findCostingDatasetByTenant = async (
  tenantId: number,
  options: {
    branchId?: number;
    categoryId?: number;
    periodDays: number;
  }
) => {
  const { branchId, categoryId, periodDays } = options;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const itemConditions = [eq(menuItems.tenantId, tenantId)];
  if (categoryId) {
    itemConditions.push(eq(menuItems.categoryId, categoryId));
  }

  const salesConditions = [
    eq(orderItems.tenantId, tenantId),
    eq(orders.tenantId, tenantId),
    gte(orders.createdAt, periodStart),
    notInArray(orders.status, ['Cancelled', 'Draft']),
  ];
  if (branchId) {
    salesConditions.push(eq(orders.branchId, branchId));
  }

  const [items, activeRecipes, salesAggRows] = await Promise.all([
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        sku: menuItems.sku,
        price: menuItems.price,
        costEstimate: menuItems.costEstimate,
        stockTrackingType: menuItems.stockTrackingType,
        directInventoryItemId: menuItems.directInventoryItemId,
        taxRate: menuItems.taxRate,
        cateringLevyRate: menuItems.cateringLevyRate,
        isTaxInclusive: menuItems.isTaxInclusive,
        categoryId: menuItems.categoryId,
        categoryName: menuCategories.name,
        directInventoryName: inventoryItems.name,
        directInventoryUnit: inventoryItems.unit,
        directInventoryCost: inventoryItems.costPrice,
        isAvailable: menuItems.isAvailable,
      })
      .from(menuItems)
      .leftJoin(
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
      .where(and(...itemConditions))
      .orderBy(asc(menuCategories.name), asc(menuItems.name)),

    db
      .select()
      .from(recipes)
      .where(and(eq(recipes.tenantId, tenantId), eq(recipes.isActive, true)))
      .orderBy(desc(recipes.updatedAt)),

    db
      .select({
        menuItemId: orderItems.menuItemId,
        unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}::numeric), 0)::float`,
        grossSales: sql<number>`coalesce(sum(${orderItems.totalPrice}::numeric), 0)::float`,
      })
      .from(orderItems)
      .innerJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.tenantId, tenantId)))
      .where(and(...salesConditions))
      .groupBy(orderItems.menuItemId),
  ]);

  const recipeIds = activeRecipes.map((r) => r.id);

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
            unitCost: inventoryItems.costPrice,
            inventoryCategory: inventoryItems.category,
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

  return {
    items,
    activeRecipes,
    ingredientsWithCost,
    salesAggRows,
  };
};