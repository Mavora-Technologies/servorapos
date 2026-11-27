"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRecipeTransaction = exports.upsertRecipeTransaction = exports.findRecipesContextByTenant = void 0;
// apps/api/src/repositories/recipe.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findRecipesContextByTenant = async (tenantId) => {
    const [allItems, allRecipes] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            sku: schema_1.menuItems.sku,
            price: schema_1.menuItems.price,
            costEstimate: schema_1.menuItems.costEstimate,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
            categoryId: schema_1.menuItems.categoryId,
            categoryName: schema_1.menuCategories.name,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.name), (0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
        db_1.db
            .select()
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.recipes.updatedAt)),
    ]);
    const recipeIds = allRecipes.map((r) => r.id);
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
            ingredientSku: schema_1.inventoryItems.sku,
            inventoryBaseUnit: schema_1.inventoryItems.unit,
            unitCost: schema_1.inventoryItems.costPrice,
            currentStock: schema_1.inventoryItems.currentStock,
        })
            .from(schema_1.recipeIngredients)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.inventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.recipeIngredients.id))
        : [];
    return { allItems, allRecipes, ingredientsWithCost };
};
exports.findRecipesContextByTenant = findRecipesContextByTenant;
const upsertRecipeTransaction = async (tenantId, defaultBranchId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Verify menu item belongs to authenticated tenant
        const [menuItem] = await tx
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
        })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
            .limit(1);
        if (!menuItem) {
            throw new Error('Selected menu item does not exist or does not belong to this tenant.');
        }
        // 2. Merge duplicate inventoryItemId lines cleanly
        const mergedByInvId = new Map();
        for (const ing of payload.ingredients) {
            const prev = mergedByInvId.get(ing.inventoryItemId);
            if (prev) {
                prev.quantity += ing.quantity;
                prev.wastagePercentage = Math.max(prev.wastagePercentage, ing.wastagePercentage);
            }
            else {
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
            id: schema_1.inventoryItems.id,
            unit: schema_1.inventoryItems.unit,
            costPrice: schema_1.inventoryItems.costPrice,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, uniqueInvIds)));
        if (matchedInventory.length !== uniqueInvIds.length) {
            throw new Error('One or more selected raw materials do not exist or do not belong to this tenant.');
        }
        const invById = new Map(matchedInventory.map((inv) => [inv.id, inv]));
        // 4. Compute authoritative batch & per-portion COGS from live inventory ledger costs
        let batchCost = 0;
        const ingredientInserts = Array.from(mergedByInvId.entries()).map(([inventoryItemId, line]) => {
            const inv = invById.get(inventoryItemId);
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
        });
        const yieldPortions = Math.max(payload.yieldPortions, 0.01);
        const cogsPerPortion = batchCost / yieldPortions;
        // 5. Upsert tenant-scoped active recipe header (incrementing version on update)
        const [existing] = await tx
            .select()
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.menuItemId, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)))
            .limit(1);
        let savedRecipe;
        if (existing) {
            const [updated] = await tx
                .update(schema_1.recipes)
                .set({
                version: existing.version + 1,
                prepTimeMinutes: payload.prepTimeMinutes,
                cookTimeMinutes: payload.cookTimeMinutes,
                yieldPortions: yieldPortions.toFixed(2),
                instructions: payload.instructions ?? null,
                notes: payload.notes ?? null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.id, existing.id), (0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId)))
                .returning();
            savedRecipe = updated;
            await tx
                .delete(schema_1.recipeIngredients)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.recipeId, existing.id), (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId)));
        }
        else {
            const [inserted] = await tx
                .insert(schema_1.recipes)
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
        await tx.insert(schema_1.recipeIngredients).values(ingredientInserts.map((row) => ({
            ...row,
            recipeId: savedRecipe.id,
        })));
        // 6. Synchronize menu_items.costEstimate so POS COGS & margins stay authoritative
        await tx
            .update(schema_1.menuItems)
            .set({
            costEstimate: cogsPerPortion.toFixed(2),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)));
        return {
            recipeId: savedRecipe.id,
            version: savedRecipe.version,
            batchCost: Number(batchCost.toFixed(2)),
            cogsPerPortion: Number(cogsPerPortion.toFixed(2)),
        };
    });
};
exports.upsertRecipeTransaction = upsertRecipeTransaction;
const deleteRecipeTransaction = async (tenantId, recipeId) => {
    return await db_1.db.transaction(async (tx) => {
        const [deleted] = await tx
            .delete(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.id, recipeId), (0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId)))
            .returning({ id: schema_1.recipes.id, menuItemId: schema_1.recipes.menuItemId });
        if (!deleted) {
            return null;
        }
        await tx
            .update(schema_1.menuItems)
            .set({ costEstimate: '0.00', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, deleted.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.stockTrackingType, 'RECIPE')));
        return deleted;
    });
};
exports.deleteRecipeTransaction = deleteRecipeTransaction;
