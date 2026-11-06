"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecipeCostingAnalytics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getRecipeCostingAnalytics = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        // 1. Fetch menu items with category context
        const items = await db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            price: schema_1.menuItems.price,
            categoryId: schema_1.menuItems.categoryId,
            categoryName: schema_1.menuCategories.name,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.menuItems.id));
        // 2. Fetch recipes
        const allRecipes = await db_1.db
            .select()
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId));
        const recipeIds = allRecipes.map((r) => r.id);
        // 3. Fetch recipe ingredients joined with inventory ledger costs
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
                .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.inventoryItemId, schema_1.inventoryItems.id))
                .where((0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds))
            : [];
        // Map ingredients to recipes
        const recipeMap = new Map();
        allRecipes.forEach((r) => {
            const rowIngredients = ingredientsWithCost.filter((ing) => ing.recipeId === r.id);
            const itemsWithCalculatedCost = rowIngredients.map((ing) => {
                const qty = Number(ing.quantity) || 0;
                const unitCost = Number(ing.unitCost) || 0;
                const wastage = Number(ing.wastagePercentage) || 0;
                const totalLineCost = qty * unitCost * (1 + wastage / 100);
                return {
                    ...ing,
                    lineCost: totalLineCost,
                };
            });
            const totalCogs = itemsWithCalculatedCost.reduce((sum, ing) => sum + ing.lineCost, 0);
            recipeMap.set(r.menuItemId, {
                ...r,
                ingredients: itemsWithCalculatedCost,
                cogs: totalCogs,
            });
        });
        let totalRevenueSum = 0;
        let totalCogsSum = 0;
        let highMarginCount = 0;
        let lowMarginCount = 0;
        const TARGET_MARGIN_PERCENT = 70.0; // Industry standard 70% food margin
        const analyzedItems = items.map((item) => {
            const rec = recipeMap.get(item.id);
            const retailPrice = Number(item.price) || 0;
            const cogs = rec ? rec.cogs : 0;
            const grossProfit = retailPrice - cogs;
            const marginPercent = retailPrice > 0 ? (grossProfit / retailPrice) * 100 : 0;
            const foodCostPercent = retailPrice > 0 ? (cogs / retailPrice) * 100 : 0;
            // Recommended price to achieve ideal 70% gross margin: (COGS / (1 - 0.70))
            const targetPrice = cogs > 0 ? cogs / 0.3 : retailPrice;
            if (rec) {
                totalRevenueSum += retailPrice;
                totalCogsSum += cogs;
                if (marginPercent >= 65) {
                    highMarginCount++;
                }
                else {
                    lowMarginCount++;
                }
            }
            return {
                menuItemId: item.id,
                itemName: item.name,
                category: item.categoryName || 'General',
                retailPrice,
                cogs,
                grossProfit,
                marginPercent: Number(marginPercent.toFixed(1)),
                foodCostPercent: Number(foodCostPercent.toFixed(1)),
                targetPrice: Math.ceil(targetPrice / 10) * 10, // Round to nearest 10 KES
                hasRecipe: !!rec,
                ingredients: rec?.ingredients || [],
            };
        });
        const formulatedCount = allRecipes.length;
        const averageMargin = totalRevenueSum > 0
            ? (((totalRevenueSum - totalCogsSum) / totalRevenueSum) * 100).toFixed(1)
            : '0.0';
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalDishes: items.length,
                    formulatedDishes: formulatedCount,
                    averageMargin: Number(averageMargin),
                    highMarginCount,
                    lowMarginCount,
                    totalCogs: Number(totalCogsSum.toFixed(2)),
                },
                items: analyzedItems,
            },
        });
    }
    catch (error) {
        console.error('[Recipe Costing Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch costing analytics' });
    }
};
exports.getRecipeCostingAnalytics = getRecipeCostingAnalytics;
