"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpsertAvailabilityTransaction = exports.upsertItemAvailabilityTransaction = exports.findAvailabilityContext = void 0;
// apps/api/src/repositories/availability.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const findAvailabilityContext = async (tenantId, branchId) => {
    const availFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId)))
        : (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId);
    const [items, availabilityRows, tenantInventory, activeRecipes] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.menuItems.id,
            name: schema_1.menuItems.name,
            sku: schema_1.menuItems.sku,
            price: schema_1.menuItems.price,
            categoryId: schema_1.menuItems.categoryId,
            categoryName: schema_1.menuCategories.name,
            stockTrackingType: schema_1.menuItems.stockTrackingType,
            directInventoryItemId: schema_1.menuItems.directInventoryItemId,
            isAvailable: schema_1.menuItems.isAvailable,
        })
            .from(schema_1.menuItems)
            .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.isAvailable, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.name), (0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
        db_1.db.select().from(schema_1.menuItemAvailability).where(availFilter),
        db_1.db
            .select({
            id: schema_1.inventoryItems.id,
            name: schema_1.inventoryItems.name,
            unit: schema_1.inventoryItems.unit,
            currentStock: schema_1.inventoryItems.currentStock,
            allowNegativeStock: schema_1.inventoryItems.allowNegativeStock,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)),
        db_1.db
            .select({
            recipeId: schema_1.recipes.id,
            menuItemId: schema_1.recipes.menuItemId,
            yieldPortions: schema_1.recipes.yieldPortions,
        })
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true))),
    ]);
    const recipeIds = activeRecipes.map((r) => r.recipeId);
    const allRecipeIngredients = recipeIds.length > 0
        ? await db_1.db
            .select({
            recipeId: schema_1.recipeIngredients.recipeId,
            inventoryItemId: schema_1.recipeIngredients.inventoryItemId,
            quantity: schema_1.recipeIngredients.quantity,
            wastagePercentage: schema_1.recipeIngredients.wastagePercentage,
        })
            .from(schema_1.recipeIngredients)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)))
        : [];
    return {
        items,
        availabilityRows,
        tenantInventory,
        activeRecipes,
        allRecipeIngredients,
    };
};
exports.findAvailabilityContext = findAvailabilityContext;
const upsertItemAvailabilityTransaction = async (tenantId, effectiveBranchId, payload, autoResetAt) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Verify menu item belongs to authenticated tenant
        const [menuItem] = await tx
            .select({ id: schema_1.menuItems.id, name: schema_1.menuItems.name })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, payload.menuItemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
            .limit(1);
        if (!menuItem) {
            return null;
        }
        // 2. Match existing availability row for this tenant + item + branch scope
        const branchMatch = effectiveBranchId
            ? (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, effectiveBranchId)
            : (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId);
        const [existing] = await tx
            .select()
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.menuItemId, payload.menuItemId), branchMatch))
            .limit(1);
        const nextRemaining = payload.is86ed ? 0 : payload.remainingCount !== undefined ? payload.remainingCount : null;
        const nextReason = payload.is86ed ? payload.reason ?? null : null;
        if (existing) {
            const [updated] = await tx
                .update(schema_1.menuItemAvailability)
                .set({
                is86ed: payload.is86ed,
                reason: nextReason,
                remainingCount: nextRemaining,
                autoResetAt: payload.is86ed ? autoResetAt : null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.id, existing.id), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId)))
                .returning();
            return updated;
        }
        const [inserted] = await tx
            .insert(schema_1.menuItemAvailability)
            .values({
            tenantId,
            branchId: effectiveBranchId,
            menuItemId: payload.menuItemId,
            is86ed: payload.is86ed,
            reason: nextReason,
            remainingCount: nextRemaining,
            autoResetAt: payload.is86ed ? autoResetAt : null,
        })
            .returning();
        return inserted;
    });
};
exports.upsertItemAvailabilityTransaction = upsertItemAvailabilityTransaction;
const bulkUpsertAvailabilityTransaction = async (tenantId, effectiveBranchId, payload, autoResetAt) => {
    return await db_1.db.transaction(async (tx) => {
        const uniqueIds = Array.from(new Set(payload.menuItemIds));
        // 1. Verify all menu items belong to this tenant
        const ownedItems = await tx
            .select({ id: schema_1.menuItems.id })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, uniqueIds)));
        if (ownedItems.length !== uniqueIds.length) {
            throw new Error('One or more menu items do not exist or do not belong to this tenant.');
        }
        const branchMatch = effectiveBranchId
            ? (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.branchId, effectiveBranchId)
            : (0, drizzle_orm_1.isNull)(schema_1.menuItemAvailability.branchId);
        const existingRows = await tx
            .select()
            .from(schema_1.menuItemAvailability)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItemAvailability.menuItemId, uniqueIds), branchMatch));
        const existingByMenuId = new Map(existingRows.map((r) => [r.menuItemId, r]));
        for (const menuItemId of uniqueIds) {
            const existing = existingByMenuId.get(menuItemId);
            const nextRemaining = payload.is86ed ? 0 : null;
            const nextReason = payload.is86ed ? payload.reason ?? null : null;
            if (existing) {
                await tx
                    .update(schema_1.menuItemAvailability)
                    .set({
                    is86ed: payload.is86ed,
                    reason: nextReason,
                    remainingCount: nextRemaining,
                    autoResetAt: payload.is86ed ? autoResetAt : null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.id, existing.id), (0, drizzle_orm_1.eq)(schema_1.menuItemAvailability.tenantId, tenantId)));
            }
            else {
                await tx.insert(schema_1.menuItemAvailability).values({
                    tenantId,
                    branchId: effectiveBranchId,
                    menuItemId,
                    is86ed: payload.is86ed,
                    reason: nextReason,
                    remainingCount: nextRemaining,
                    autoResetAt: payload.is86ed ? autoResetAt : null,
                });
            }
        }
        return { updatedCount: uniqueIds.length };
    });
};
exports.bulkUpsertAvailabilityTransaction = bulkUpsertAvailabilityTransaction;
