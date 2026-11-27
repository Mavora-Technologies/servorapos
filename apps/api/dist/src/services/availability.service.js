"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkToggleItemAvailability = exports.toggleSingleItemAvailability = exports.fetchTenantAvailabilityOverview = void 0;
// apps/api/src/services/availability.service.ts
const availabilityRepo = __importStar(require("../repositories/availability.repository"));
function computeNextMorningReset() {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
    return next;
}
const fetchTenantAvailabilityOverview = async (tenantId, branchId) => {
    const { items, availabilityRows, tenantInventory, activeRecipes, allRecipeIngredients, } = await availabilityRepo.findAvailabilityContext(tenantId, branchId);
    const now = new Date();
    // Prefer branch-specific availability row over tenant-wide fallback
    const availByMenuId = new Map();
    for (const row of availabilityRows) {
        const existing = availByMenuId.get(row.menuItemId);
        if (!existing || (branchId && row.branchId === branchId && existing.branchId !== branchId)) {
            availByMenuId.set(row.menuItemId, row);
        }
    }
    const invById = new Map(tenantInventory.map((inv) => [
        inv.id,
        { ...inv, stockNum: parseFloat(inv.currentStock) || 0 },
    ]));
    const recipeByMenuId = new Map(activeRecipes.map((r) => [
        r.menuItemId,
        { recipeId: r.recipeId, yieldPortions: parseFloat(r.yieldPortions) || 1 },
    ]));
    const ingredientsByRecipeId = new Map();
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
        const autoResetExpired = manual?.autoResetAt !== null &&
            manual?.autoResetAt !== undefined &&
            new Date(manual.autoResetAt) <= now;
        const isManually86ed = manual ? manual.is86ed && !autoResetExpired : false;
        const manualRemainingCount = manual && !autoResetExpired ? (manual.remainingCount ?? null) : null;
        // Compute live inventory/BOM portion limit
        let inventoryMaxPortions = null;
        let limitingIngredientName = null;
        if (item.stockTrackingType === 'STOCKED_PRODUCT' && item.directInventoryItemId) {
            const inv = invById.get(item.directInventoryItemId);
            if (inv && !inv.allowNegativeStock) {
                inventoryMaxPortions = Math.max(0, Math.floor(inv.stockNum));
                limitingIngredientName = inv.name;
            }
        }
        else if (item.stockTrackingType === 'RECIPE' ||
            item.stockTrackingType === 'COMPOSITE') {
            const rec = recipeByMenuId.get(item.id);
            if (rec) {
                const ings = ingredientsByRecipeId.get(rec.recipeId) ?? [];
                const yieldPortions = rec.yieldPortions > 0 ? rec.yieldPortions : 1;
                for (const ing of ings) {
                    const inv = invById.get(ing.inventoryItemId);
                    if (!inv || inv.allowNegativeStock)
                        continue;
                    const baseQty = parseFloat(ing.quantity) || 0;
                    const wastagePct = parseFloat(ing.wastagePercentage) || 0;
                    const requiredPerPortion = (baseQty * (1 + wastagePct / 100)) / yieldPortions;
                    if (requiredPerPortion <= 0)
                        continue;
                    const possiblePortions = Math.max(0, Math.floor(inv.stockNum / requiredPerPortion));
                    if (inventoryMaxPortions === null || possiblePortions < inventoryMaxPortions) {
                        inventoryMaxPortions = possiblePortions;
                        limitingIngredientName = inv.name;
                    }
                }
            }
        }
        let effectiveRemaining = inventoryMaxPortions;
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
            if (isManually86ed)
                manual86Count++;
            else if (isInventoryDepleted)
                inventoryDepletedCount++;
        }
        else {
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
exports.fetchTenantAvailabilityOverview = fetchTenantAvailabilityOverview;
const toggleSingleItemAvailability = async (tenantId, defaultBranchId, payload) => {
    const effectiveBranchId = payload.branchId !== undefined ? payload.branchId : defaultBranchId;
    const autoResetAt = payload.is86ed && payload.autoResetTomorrow ? computeNextMorningReset() : null;
    return await availabilityRepo.upsertItemAvailabilityTransaction(tenantId, effectiveBranchId, payload, autoResetAt);
};
exports.toggleSingleItemAvailability = toggleSingleItemAvailability;
const bulkToggleItemAvailability = async (tenantId, defaultBranchId, payload) => {
    const effectiveBranchId = payload.branchId !== undefined ? payload.branchId : defaultBranchId;
    const autoResetAt = payload.is86ed && payload.autoResetTomorrow ? computeNextMorningReset() : null;
    return await availabilityRepo.bulkUpsertAvailabilityTransaction(tenantId, effectiveBranchId, payload, autoResetAt);
};
exports.bulkToggleItemAvailability = bulkToggleItemAvailability;
