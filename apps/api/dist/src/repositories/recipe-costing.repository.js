"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCostingDatasetByTenant = void 0;
// apps/api/src/repositories/recipe-costing.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findCostingDatasetByTenant = async (tenantId, options) => {
    const { branchId, categoryId, periodDays } = options;
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const itemConditions = [(0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)];
    if (categoryId) {
        itemConditions.push((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, categoryId));
    }
    const salesConditions = [
        (0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, periodStart),
        (0, drizzle_orm_1.notInArray)(schema_1.orders.status, ['Cancelled', 'Draft']),
    ];
    if (branchId) {
        salesConditions.push((0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId));
    }
    const [items, activeRecipes, salesAggRows] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            sku: schema_1.menuItems.sku,
            price: schema_1.menuItems.price,
            costEstimate: schema_1.menuItems.costEstimate,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
            directInventoryItemId: schema_1.menuItems.directInventoryItemId,
            taxRate: schema_1.menuItems.taxRate,
            cateringLevyRate: schema_1.menuItems.cateringLevyRate,
            isTaxInclusive: schema_1.menuItems.isTaxInclusive,
            categoryId: schema_1.menuItems.categoryId,
            categoryName: schema_1.menuCategories.name,
            directInventoryName: schema_1.inventoryItems.name,
            directInventoryUnit: schema_1.inventoryItems.unit,
            directInventoryCost: schema_1.inventoryItems.costPrice,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
            .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.directInventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...itemConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.name), (0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
        db_1.db
            .select()
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.recipes.updatedAt)),
        db_1.db
            .select({
            menuItemId: schema_1.orderItems.menuItemId,
            unitsSold: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.quantity}::numeric), 0)::float`,
            grossSales: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.orderItems.totalPrice}::numeric), 0)::float`,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...salesConditions))
            .groupBy(schema_1.orderItems.menuItemId),
    ]);
    const recipeIds = activeRecipes.map((r) => r.id);
    const ingredientsWithCost = recipeIds.length > 0
        ? await db_1.db
            .select({
            id: schema_1.recipeIngredients.id,
            recipeId: schema_1.recipeIngredients.recipeId,
            inventoryItemId: schema_1.recipeIngredients.inventoryItemId,
            quantity: schema_1.recipeIngredients.quantity,
            unit: schema_1.recipeIngredients.unit,
            wastagePercentage: schema_1.recipeIngredients.wastagePercentage,
            ingredientName: schema_1.inventoryItems.name,
            unitCost: schema_1.inventoryItems.costPrice,
            inventoryCategory: schema_1.inventoryItems.category,
        })
            .from(schema_1.recipeIngredients)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.inventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.recipeIngredients.id))
        : [];
    return {
        items,
        activeRecipes,
        ingredientsWithCost,
        salesAggRows,
    };
};
exports.findCostingDatasetByTenant = findCostingDatasetByTenant;
