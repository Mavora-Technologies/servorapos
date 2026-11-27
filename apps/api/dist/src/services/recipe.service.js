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
exports.removeTenantRecipe = exports.saveTenantRecipe = exports.fetchTenantRecipesOverview = void 0;
// apps/api/src/services/recipe.service.ts
const recipeRepo = __importStar(require("../repositories/recipe.repository"));
const fetchTenantRecipesOverview = async (tenantId) => {
    const { allItems, allRecipes, ingredientsWithCost } = await recipeRepo.findRecipesContextByTenant(tenantId);
    const ingredientsByRecipeId = new Map();
    for (const ing of ingredientsWithCost) {
        const list = ingredientsByRecipeId.get(ing.recipeId) ?? [];
        list.push(ing);
        ingredientsByRecipeId.set(ing.recipeId, list);
    }
    // Keep the latest active recipe per menuItemId
    const recipeByMenuId = new Map();
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
exports.fetchTenantRecipesOverview = fetchTenantRecipesOverview;
const saveTenantRecipe = async (tenantId, defaultBranchId, payload) => {
    return await recipeRepo.upsertRecipeTransaction(tenantId, defaultBranchId, payload);
};
exports.saveTenantRecipe = saveTenantRecipe;
const removeTenantRecipe = async (tenantId, recipeId) => {
    if (!Number.isInteger(recipeId) || recipeId <= 0) {
        throw new Error('Invalid recipe ID');
    }
    return await recipeRepo.deleteRecipeTransaction(tenantId, recipeId);
};
exports.removeTenantRecipe = removeTenantRecipe;
