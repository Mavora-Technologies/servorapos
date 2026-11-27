"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMenuItemRecord = exports.updateMenuItemTransaction = exports.createMenuItemTransaction = exports.getMenuCatalogWithLinks = exports.getActiveMenu = exports.getCategories = exports.deleteCategoryRecord = exports.updateCategoryRecord = exports.createCategory = exports.isImagePublicIdReferenced = void 0;
// apps/api/src/repositories/menu.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const cloudinary_1 = require("../utils/cloudinary");
async function syncMenuItemModifierGroupsInTx(tx, tenantId, menuItemId, modifierGroupIds) {
    const uniqueModGroupIds = Array.from(new Set(modifierGroupIds));
    if (uniqueModGroupIds.length > 0) {
        const matchedGroups = await tx
            .select({ id: schema_1.modifierGroups.id })
            .from(schema_1.modifierGroups)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.modifierGroups.id, uniqueModGroupIds)));
        if (matchedGroups.length !== uniqueModGroupIds.length) {
            throw new Error('One or more selected modifier groups do not exist or belong to another tenant.');
        }
    }
    await tx
        .delete(schema_1.menuItemModifierGroups)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemModifierGroups.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItemModifierGroups.menuItemId, menuItemId)));
    if (uniqueModGroupIds.length > 0) {
        await tx.insert(schema_1.menuItemModifierGroups).values(uniqueModGroupIds.map((modifierGroupId, idx) => ({
            tenantId,
            menuItemId,
            modifierGroupId,
            sortOrder: idx,
        })));
    }
}
const isImagePublicIdReferenced = async (tenantId, publicId) => {
    const [row] = await db_1.db
        .select({ id: schema_1.menuItems.id })
        .from(schema_1.menuItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.imagePublicId, publicId)))
        .limit(1);
    return Boolean(row);
};
exports.isImagePublicIdReferenced = isImagePublicIdReferenced;
const createCategory = async (tenantId, data) => {
    const [duplicate] = await db_1.db
        .select({ id: schema_1.menuCategories.id })
        .from(schema_1.menuCategories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.menuCategories.name, data.name)))
        .limit(1);
    if (duplicate) {
        throw new Error(`Category "${data.name}" already exists for this tenant.`);
    }
    const [category] = await db_1.db
        .insert(schema_1.menuCategories)
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
exports.createCategory = createCategory;
const updateCategoryRecord = async (tenantId, categoryId, data) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.menuCategories.id })
        .from(schema_1.menuCategories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.id, categoryId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
        .limit(1);
    if (!existing)
        return null;
    if (data.name !== undefined) {
        const [duplicate] = await db_1.db
            .select({ id: schema_1.menuCategories.id })
            .from(schema_1.menuCategories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.ilike)(schema_1.menuCategories.name, data.name), (0, drizzle_orm_1.ne)(schema_1.menuCategories.id, categoryId)))
            .limit(1);
        if (duplicate) {
            throw new Error(`Another category named "${data.name}" already exists.`);
        }
    }
    const updateFields = {
        updatedAt: new Date(),
    };
    if (data.name !== undefined)
        updateFields.name = data.name;
    if (data.description !== undefined)
        updateFields.description = data.description;
    if (data.sortOrder !== undefined)
        updateFields.sortOrder = data.sortOrder;
    if (data.isActive !== undefined)
        updateFields.isActive = data.isActive;
    if (data.branchId !== undefined)
        updateFields.branchId = data.branchId;
    const [updated] = await db_1.db
        .update(schema_1.menuCategories)
        .set(updateFields)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.id, categoryId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
        .returning();
    return updated ?? null;
};
exports.updateCategoryRecord = updateCategoryRecord;
const deleteCategoryRecord = async (tenantId, categoryId) => {
    const [linkedCount] = await db_1.db
        .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(schema_1.menuItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, categoryId)));
    if ((linkedCount?.count ?? 0) > 0) {
        const err = new Error(`Cannot delete category: ${linkedCount.count} menu item(s) are still assigned to it. Reassign those items or mark the category Inactive instead.`);
        err.statusCode = 409;
        throw err;
    }
    const [deleted] = await db_1.db
        .delete(schema_1.menuCategories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.id, categoryId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
        .returning({ id: schema_1.menuCategories.id });
    return deleted ?? null;
};
exports.deleteCategoryRecord = deleteCategoryRecord;
const getCategories = async (tenantId, branchId, includeInactive = false) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)];
    if (!includeInactive) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true));
    }
    if (branchId) {
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuCategories.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuCategories.branchId)));
    }
    return await db_1.db
        .select()
        .from(schema_1.menuCategories)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.sortOrder), (0, drizzle_orm_1.asc)(schema_1.menuCategories.name));
};
exports.getCategories = getCategories;
const getActiveMenu = async (tenantId, branchId) => {
    const categoryFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuCategories.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuCategories.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true));
    const itemFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.isAvailable, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItems.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItems.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.isAvailable, true));
    const ruleFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.itemPricingRules.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.itemPricingRules.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.itemPricingRules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.itemPricingRules.isActive, true));
    const [categories, items, pricingRules] = await Promise.all([
        db_1.db
            .select()
            .from(schema_1.menuCategories)
            .where(categoryFilter)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.sortOrder), (0, drizzle_orm_1.asc)(schema_1.menuCategories.name)),
        db_1.db
            .select()
            .from(schema_1.menuItems)
            .where(itemFilter)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
        db_1.db
            .select({
            id: schema_1.itemPricingRules.id,
            branchId: schema_1.itemPricingRules.branchId,
            menuItemId: schema_1.itemPricingRules.menuItemId,
            ruleName: schema_1.itemPricingRules.ruleName,
            ruleType: schema_1.itemPricingRules.ruleType,
            value: schema_1.itemPricingRules.value,
            startTime: schema_1.itemPricingRules.startTime,
            endTime: schema_1.itemPricingRules.endTime,
            daysOfWeek: schema_1.itemPricingRules.daysOfWeek,
            isActive: schema_1.itemPricingRules.isActive,
        })
            .from(schema_1.itemPricingRules)
            .where(ruleFilter)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.itemPricingRules.createdAt)),
    ]);
    return { categories, items, pricingRules };
};
exports.getActiveMenu = getActiveMenu;
const getMenuCatalogWithLinks = async (tenantId, branchId) => {
    const categoryFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuCategories.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuCategories.branchId)))
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true));
    const itemFilter = branchId
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.menuItems.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.menuItems.branchId)))
        : (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId);
    const [categories, rows, activeRecipes, linkedModifierRows] = await Promise.all([
        db_1.db
            .select()
            .from(schema_1.menuCategories)
            .where(categoryFilter)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.sortOrder), (0, drizzle_orm_1.asc)(schema_1.menuCategories.name)),
        db_1.db
            .select({
            item: schema_1.menuItems,
            categoryName: schema_1.menuCategories.name,
            directInventoryName: schema_1.inventoryItems.name,
            directInventorySku: schema_1.inventoryItems.sku,
            directInventoryUnit: schema_1.inventoryItems.unit,
            directInventoryCost: schema_1.inventoryItems.costPrice,
            directInventoryStock: schema_1.inventoryItems.currentStock,
        })
            .from(schema_1.menuItems)
            .innerJoin(schema_1.menuCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)))
            .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.directInventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .where(itemFilter)
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItems.name)),
        db_1.db
            .select({
            recipeId: schema_1.recipes.id,
            menuItemId: schema_1.recipes.menuItemId,
        })
            .from(schema_1.recipes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true))),
        db_1.db
            .select({
            menuItemId: schema_1.menuItemModifierGroups.menuItemId,
            modifierGroupId: schema_1.modifierGroups.id,
            modifierGroupName: schema_1.modifierGroups.name,
            isRequired: schema_1.modifierGroups.isRequired,
            sortOrder: schema_1.menuItemModifierGroups.sortOrder,
        })
            .from(schema_1.menuItemModifierGroups)
            .innerJoin(schema_1.modifierGroups, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItemModifierGroups.modifierGroupId, schema_1.modifierGroups.id), (0, drizzle_orm_1.eq)(schema_1.modifierGroups.tenantId, tenantId)))
            .where((0, drizzle_orm_1.eq)(schema_1.menuItemModifierGroups.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItemModifierGroups.sortOrder), (0, drizzle_orm_1.asc)(schema_1.modifierGroups.name)),
    ]);
    const recipeIds = activeRecipes.map((r) => r.recipeId);
    const ingredientsByMenuItemId = new Map();
    if (recipeIds.length > 0) {
        const recipeToMenuItem = new Map();
        activeRecipes.forEach((r) => recipeToMenuItem.set(r.recipeId, r.menuItemId));
        const ingredientRows = await db_1.db
            .select({
            id: schema_1.recipeIngredients.id,
            recipeId: schema_1.recipeIngredients.recipeId,
            inventoryItemId: schema_1.recipeIngredients.inventoryItemId,
            inventoryItemName: schema_1.inventoryItems.name,
            inventoryItemSku: schema_1.inventoryItems.sku,
            quantity: schema_1.recipeIngredients.quantity,
            unit: schema_1.recipeIngredients.unit,
            wastagePercentage: schema_1.recipeIngredients.wastagePercentage,
            unitCost: schema_1.inventoryItems.costPrice,
        })
            .from(schema_1.recipeIngredients)
            .innerJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.inventoryItemId, schema_1.inventoryItems.id), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.recipeIngredients.recipeId, recipeIds)));
        for (const ing of ingredientRows) {
            const menuItemId = recipeToMenuItem.get(ing.recipeId);
            if (!menuItemId)
                continue;
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
    const modGroupsByMenuItemId = new Map();
    for (const row of linkedModifierRows) {
        const list = modGroupsByMenuItemId.get(row.menuItemId) ?? [];
        list.push({
            id: row.modifierGroupId,
            name: row.modifierGroupName,
            isRequired: row.isRequired,
            sortOrder: row.sortOrder,
        });
        modGroupsByMenuItemId.set(row.menuItemId, list);
    }
    const items = rows.map((row) => {
        const attachedModGroups = modGroupsByMenuItemId.get(row.item.id) ?? [];
        return {
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
            modifierGroupIds: attachedModGroups.map((g) => g.id),
            modifierGroups: attachedModGroups,
            kitchenStation: row.item.kitchenStation,
            prepTimeMinutes: row.item.prepTimeMinutes,
            taxRate: parseFloat(row.item.taxRate),
            cateringLevyRate: parseFloat(row.item.cateringLevyRate),
            isTaxInclusive: row.item.isTaxInclusive,
            isAvailable: row.item.isAvailable,
            imageUrl: row.item.imageUrl,
            imagePublicId: row.item.imagePublicId,
            imageOriginalFilename: row.item.imageOriginalFilename,
            imageMimeType: row.item.imageMimeType,
            imageFileSize: row.item.imageFileSize,
            imageUploadedAt: row.item.imageUploadedAt,
        };
    });
    return { categories, items };
};
exports.getMenuCatalogWithLinks = getMenuCatalogWithLinks;
const createMenuItemTransaction = async (tenantId, data) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Verify category belongs to authenticated tenant
        const [category] = await tx
            .select({ id: schema_1.menuCategories.id })
            .from(schema_1.menuCategories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.id, data.categoryId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)));
        if (!category) {
            throw new Error('Selected menu category does not belong to this tenant.');
        }
        // 2. Verify SKU uniqueness within tenant if provided
        if (data.sku) {
            const [dupSku] = await tx
                .select({ id: schema_1.menuItems.id })
                .from(schema_1.menuItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.sku, data.sku)));
            if (dupSku) {
                throw new Error(`SKU "${data.sku}" is already assigned to another menu item.`);
            }
        }
        // 3. Enforce tenant ownership on uploaded Cloudinary public ID
        if (data.imagePublicId) {
            (0, cloudinary_1.assertPublicIdBelongsToTenant)(tenantId, data.imagePublicId);
        }
        // 4. Validate direct inventory link or recipe raw materials
        let resolvedDirectInvId = null;
        let computedCost = data.costEstimate ?? 0;
        if (data.stockTrackingType === 'STOCKED_PRODUCT' && data.directInventoryItemId) {
            const [invItem] = await tx
                .select({ id: schema_1.inventoryItems.id, costPrice: schema_1.inventoryItems.costPrice })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, data.directInventoryItemId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
            if (!invItem) {
                throw new Error('Linked stocked product does not exist or belongs to another tenant.');
            }
            resolvedDirectInvId = invItem.id;
            if (data.costEstimate === undefined) {
                computedCost = parseFloat(invItem.costPrice) || 0;
            }
        }
        const recipeLines = (data.stockTrackingType === 'RECIPE' || data.stockTrackingType === 'COMPOSITE') &&
            Array.isArray(data.recipeIngredients)
            ? data.recipeIngredients
            : [];
        if (recipeLines.length > 0) {
            const uniqueInvIds = Array.from(new Set(recipeLines.map((l) => l.inventoryItemId)));
            const matchedInv = await tx
                .select({ id: schema_1.inventoryItems.id, costPrice: schema_1.inventoryItems.costPrice })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, uniqueInvIds)));
            if (matchedInv.length !== uniqueInvIds.length) {
                throw new Error('One or more linked raw materials are invalid or do not belong to this tenant.');
            }
            const costById = new Map(matchedInv.map((m) => [m.id, parseFloat(m.costPrice) || 0]));
            computedCost = recipeLines.reduce((sum, line) => {
                const unitCost = costById.get(line.inventoryItemId) ?? 0;
                const wastageFactor = 1 + (line.wastagePercentage || 0) / 100;
                return sum + line.quantity * unitCost * wastageFactor;
            }, 0);
        }
        // 5. Insert Menu Item with Image Metadata
        const [createdItem] = await tx
            .insert(schema_1.menuItems)
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
            imagePublicId: data.imageUrl ? (data.imagePublicId ?? null) : null,
            imageOriginalFilename: data.imageUrl ? (data.imageOriginalFilename ?? null) : null,
            imageMimeType: data.imageUrl ? (data.imageMimeType ?? null) : null,
            imageFileSize: data.imageUrl ? (data.imageFileSize ?? null) : null,
            imageUploadedAt: data.imageUrl ? new Date() : null,
        })
            .returning();
        // 6. Persist Recipe BOM lines if provided
        if (recipeLines.length > 0) {
            const [createdRecipe] = await tx
                .insert(schema_1.recipes)
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
            await tx.insert(schema_1.recipeIngredients).values(recipeLines.map((line) => ({
                tenantId,
                recipeId: createdRecipe.id,
                inventoryItemId: line.inventoryItemId,
                quantity: line.quantity.toFixed(4),
                unit: line.unit,
                wastagePercentage: (line.wastagePercentage ?? 0).toFixed(2),
            })));
        }
        // 7. Attach Modifier Groups if provided
        if (data.modifierGroupIds !== undefined) {
            await syncMenuItemModifierGroupsInTx(tx, tenantId, createdItem.id, data.modifierGroupIds);
        }
        return createdItem;
    });
};
exports.createMenuItemTransaction = createMenuItemTransaction;
const updateMenuItemTransaction = async (tenantId, itemId, data) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, itemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (data.categoryId !== undefined) {
            const [cat] = await tx
                .select({ id: schema_1.menuCategories.id })
                .from(schema_1.menuCategories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.id, data.categoryId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId)));
            if (!cat) {
                throw new Error('Selected menu category does not belong to this tenant.');
            }
        }
        if (data.sku) {
            const [dupSku] = await tx
                .select({ id: schema_1.menuItems.id })
                .from(schema_1.menuItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuItems.sku, data.sku), (0, drizzle_orm_1.ne)(schema_1.menuItems.id, itemId)));
            if (dupSku) {
                throw new Error(`SKU "${data.sku}" is already assigned to another menu item.`);
            }
        }
        if (data.imagePublicId) {
            (0, cloudinary_1.assertPublicIdBelongsToTenant)(tenantId, data.imagePublicId);
        }
        const nextTrackingType = data.stockTrackingType ?? existing.stockTrackingType;
        const updateFields = {
            updatedAt: new Date(),
        };
        if (data.categoryId !== undefined)
            updateFields.categoryId = data.categoryId;
        if (data.branchId !== undefined)
            updateFields.branchId = data.branchId;
        if (data.name !== undefined)
            updateFields.name = data.name;
        if (data.sku !== undefined)
            updateFields.sku = data.sku;
        if (data.description !== undefined)
            updateFields.description = data.description;
        if (data.price !== undefined)
            updateFields.price = data.price.toFixed(2);
        if (data.costEstimate !== undefined)
            updateFields.costEstimate = data.costEstimate.toFixed(2);
        if (data.stockTrackingType !== undefined) {
            updateFields.stockTrackingType = data.stockTrackingType;
        }
        if (data.kitchenStation !== undefined)
            updateFields.kitchenStation = data.kitchenStation;
        if (data.prepTimeMinutes !== undefined)
            updateFields.prepTimeMinutes = data.prepTimeMinutes;
        if (data.taxRate !== undefined)
            updateFields.taxRate = data.taxRate.toFixed(2);
        if (data.cateringLevyRate !== undefined) {
            updateFields.cateringLevyRate = data.cateringLevyRate.toFixed(2);
        }
        if (data.isTaxInclusive !== undefined)
            updateFields.isTaxInclusive = data.isTaxInclusive;
        if (data.isAvailable !== undefined)
            updateFields.isAvailable = data.isAvailable;
        // Handle image update / removal metadata
        if (data.imageUrl !== undefined) {
            updateFields.imageUrl = data.imageUrl;
            if (data.imageUrl === null) {
                updateFields.imagePublicId = null;
                updateFields.imageOriginalFilename = null;
                updateFields.imageMimeType = null;
                updateFields.imageFileSize = null;
                updateFields.imageUploadedAt = null;
            }
            else {
                if (data.imagePublicId !== undefined)
                    updateFields.imagePublicId = data.imagePublicId;
                if (data.imageOriginalFilename !== undefined) {
                    updateFields.imageOriginalFilename = data.imageOriginalFilename;
                }
                if (data.imageMimeType !== undefined)
                    updateFields.imageMimeType = data.imageMimeType;
                if (data.imageFileSize !== undefined)
                    updateFields.imageFileSize = data.imageFileSize;
                if (data.imageUrl !== existing.imageUrl) {
                    updateFields.imageUploadedAt = new Date();
                }
            }
        }
        else {
            if (data.imagePublicId !== undefined)
                updateFields.imagePublicId = data.imagePublicId;
            if (data.imageOriginalFilename !== undefined) {
                updateFields.imageOriginalFilename = data.imageOriginalFilename;
            }
            if (data.imageMimeType !== undefined)
                updateFields.imageMimeType = data.imageMimeType;
            if (data.imageFileSize !== undefined)
                updateFields.imageFileSize = data.imageFileSize;
        }
        // Handle STOCKED_PRODUCT direct inventory link
        if (nextTrackingType === 'STOCKED_PRODUCT') {
            const targetInvId = data.directInventoryItemId !== undefined
                ? data.directInventoryItemId
                : existing.directInventoryItemId;
            if (!targetInvId) {
                throw new Error('A stocked inventory product must be linked for STOCKED_PRODUCT items.');
            }
            const [invItem] = await tx
                .select({ id: schema_1.inventoryItems.id, costPrice: schema_1.inventoryItems.costPrice })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, targetInvId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId)));
            if (!invItem) {
                throw new Error('Linked stocked product does not exist or belongs to another tenant.');
            }
            updateFields.directInventoryItemId = invItem.id;
            if (data.costEstimate === undefined) {
                updateFields.costEstimate = (parseFloat(invItem.costPrice) || 0).toFixed(2);
            }
        }
        else {
            updateFields.directInventoryItemId = null;
        }
        // Handle RECIPE / COMPOSITE BOM updates
        if ((nextTrackingType === 'RECIPE' || nextTrackingType === 'COMPOSITE') &&
            data.recipeIngredients !== undefined) {
            const recipeLines = data.recipeIngredients;
            let calculatedRecipeCost = 0;
            if (recipeLines.length > 0) {
                const uniqueInvIds = Array.from(new Set(recipeLines.map((l) => l.inventoryItemId)));
                const matchedInv = await tx
                    .select({ id: schema_1.inventoryItems.id, costPrice: schema_1.inventoryItems.costPrice })
                    .from(schema_1.inventoryItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, uniqueInvIds)));
                if (matchedInv.length !== uniqueInvIds.length) {
                    throw new Error('One or more linked raw materials are invalid or do not belong to this tenant.');
                }
                const costById = new Map(matchedInv.map((m) => [m.id, parseFloat(m.costPrice) || 0]));
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
                .from(schema_1.recipes)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.menuItemId, itemId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)))
                .limit(1);
            let recipeId = existingRecipe?.id;
            if (!recipeId && recipeLines.length > 0) {
                const [newRecipe] = await tx
                    .insert(schema_1.recipes)
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
                    .delete(schema_1.recipeIngredients)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.recipeId, recipeId)));
                if (recipeLines.length > 0) {
                    await tx.insert(schema_1.recipeIngredients).values(recipeLines.map((line) => ({
                        tenantId,
                        recipeId,
                        inventoryItemId: line.inventoryItemId,
                        quantity: line.quantity.toFixed(4),
                        unit: line.unit,
                        wastagePercentage: (line.wastagePercentage ?? 0).toFixed(2),
                    })));
                }
            }
        }
        // Sync Attached Modifier Groups if provided
        if (data.modifierGroupIds !== undefined) {
            await syncMenuItemModifierGroupsInTx(tx, tenantId, itemId, data.modifierGroupIds);
        }
        const [updated] = await tx
            .update(schema_1.menuItems)
            .set(updateFields)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, itemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
            .returning();
        if (!updated)
            return null;
        return {
            item: updated,
            previousImagePublicId: existing.imagePublicId,
        };
    });
};
exports.updateMenuItemTransaction = updateMenuItemTransaction;
const deleteMenuItemRecord = async (tenantId, itemId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.menuItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.id, itemId), (0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId)))
        .returning({ id: schema_1.menuItems.id, imagePublicId: schema_1.menuItems.imagePublicId });
    return deleted ?? null;
};
exports.deleteMenuItemRecord = deleteMenuItemRecord;
