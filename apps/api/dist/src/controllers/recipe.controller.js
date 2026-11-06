"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRecipe = exports.getRecipesOverview = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const recipe_validator_1 = require("../validators/recipe.validator");
const getRecipesOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        // 1. Fetch menu items for this tenant
        const allItems = await db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            price: schema_1.menuItems.price,
        })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.menuItems.id));
        // 2. Fetch recipes
        const allRecipes = await db_1.db
            .select()
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId));
        const recipeIds = allRecipes.map((r) => r.id);
        // 3. Fetch ingredients joined with inventory items to derive item name & live unit cost
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
            })
                .from(schema_1.recipeIngredients)
                .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.inventoryItemId, schema_1.inventoryItems.id))
                .where((0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds))
            : [];
        const recipeMap = new Map();
        allRecipes.forEach((r) => {
            const items = ingredientsWithCost.filter((ing) => ing.recipeId === r.id);
            const totalEstimatedCost = items.reduce((sum, cur) => {
                const qty = Number(cur.quantity) || 0;
                const cost = Number(cur.unitCost) || 0;
                const wastage = Number(cur.wastagePercentage) || 0;
                const costWithWastage = qty * cost * (1 + wastage / 100);
                return sum + costWithWastage;
            }, 0);
            recipeMap.set(r.menuItemId, {
                ...r,
                ingredients: items,
                calculatedCogs: totalEstimatedCost,
            });
        });
        const data = allItems.map((item) => {
            const rec = recipeMap.get(item.id);
            const retailPrice = Number(item.price);
            const cogs = rec ? rec.calculatedCogs : 0;
            const margin = retailPrice > 0 ? ((retailPrice - cogs) / retailPrice) * 100 : 0;
            return {
                menuItemId: item.id,
                itemName: item.name,
                retailPrice: item.price,
                hasRecipe: !!rec,
                recipe: rec || null,
                marginPercent: margin.toFixed(1),
            };
        });
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        console.error('[Recipes Overview Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch recipes' });
    }
};
exports.getRecipesOverview = getRecipesOverview;
const saveRecipe = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const branchId = req.user?.defaultBranchId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = recipe_validator_1.upsertRecipeSchema.parse(req.body);
        const saved = await db_1.db.transaction(async (tx) => {
            const [existing] = await tx
                .select()
                .from(schema_1.recipes)
                .where((0, drizzle_orm_1.eq)(schema_1.recipes.menuItemId, payload.menuItemId))
                .limit(1);
            let targetRecipeId;
            if (existing) {
                await tx
                    .update(schema_1.recipes)
                    .set({
                    prepTimeMinutes: payload.prepTimeMinutes,
                    cookTimeMinutes: payload.cookTimeMinutes,
                    yieldPortions: payload.yieldPortions.toFixed(2), // Convert decimal number to string
                    instructions: payload.instructions,
                    notes: payload.notes,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.recipes.id, existing.id));
                targetRecipeId = existing.id;
                await tx
                    .delete(schema_1.recipeIngredients)
                    .where((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.recipeId, existing.id));
            }
            else {
                const [inserted] = await tx
                    .insert(schema_1.recipes)
                    .values({
                    tenantId,
                    branchId: branchId || null,
                    menuItemId: payload.menuItemId,
                    prepTimeMinutes: payload.prepTimeMinutes,
                    cookTimeMinutes: payload.cookTimeMinutes,
                    yieldPortions: payload.yieldPortions.toFixed(2), // Convert decimal number to string
                    instructions: payload.instructions,
                    notes: payload.notes,
                })
                    .returning();
                targetRecipeId = inserted.id;
            }
            // Map payload items directly to the database schema structure
            const ingredientRows = payload.ingredients.map((ing) => ({
                tenantId,
                recipeId: targetRecipeId,
                inventoryItemId: Number(ing.inventoryItemId || ing.id || 1),
                quantity: Number(ing.quantity).toFixed(4),
                unit: ing.unit || 'pcs',
                wastagePercentage: (Number(ing.wastagePercentage) || 0).toFixed(2),
            }));
            if (ingredientRows.length > 0) {
                await tx.insert(schema_1.recipeIngredients).values(ingredientRows);
            }
            return targetRecipeId;
        });
        res.status(200).json({
            status: 'success',
            message: 'Recipe specification saved',
            data: { recipeId: saved },
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        console.error('[Save Recipe Error]:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.saveRecipe = saveRecipe;
