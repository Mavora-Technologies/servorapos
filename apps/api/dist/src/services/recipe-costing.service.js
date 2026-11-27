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
exports.computeTenantCostingMatrix = void 0;
// apps/api/src/services/recipe-costing.service.ts
const costingRepo = __importStar(require("../repositories/recipe-costing.repository"));
const computeTenantCostingMatrix = async (tenantId, params) => {
    const { items, activeRecipes, ingredientsWithCost, salesAggRows } = await costingRepo.findCostingDatasetByTenant(tenantId, {
        branchId: params.branchId,
        categoryId: params.categoryId,
        periodDays: params.periodDays,
    });
    // 1. Index latest active recipe per menuItemId
    const recipeByMenuId = new Map();
    for (const r of activeRecipes) {
        if (!recipeByMenuId.has(r.menuItemId)) {
            recipeByMenuId.set(r.menuItemId, r);
        }
    }
    // 2. Index ingredients by recipeId
    const ingredientsByRecipeId = new Map();
    for (const ing of ingredientsWithCost) {
        const list = ingredientsByRecipeId.get(ing.recipeId) ?? [];
        list.push(ing);
        ingredientsByRecipeId.set(ing.recipeId, list);
    }
    // 3. Index live period sales by menuItemId
    const salesByMenuId = new Map();
    for (const row of salesAggRows) {
        salesByMenuId.set(row.menuItemId, {
            unitsSold: Number(row.unitsSold) || 0,
            grossSales: Number(row.grossSales) || 0,
        });
    }
    const targetMarginDecimal = params.targetMarginPercent / 100;
    const targetCostRatio = Math.max(0.05, 1 - targetMarginDecimal);
    let costedRevenueSum = 0;
    let costedCogsSum = 0;
    let weightedNetRevenueSum = 0;
    let weightedCogsSum = 0;
    let totalContributionMargin = 0;
    let totalUnitsSold = 0;
    let costedDishesCount = 0;
    let highMarginCount = 0;
    let lowMarginCount = 0;
    // 4. First pass: compute unit economics per menu item
    const rawAnalyzed = items.map((item) => {
        const shelfPrice = parseFloat(item.price) || 0;
        const vatRate = (parseFloat(item.taxRate) || 0) / 100;
        const levyRate = (parseFloat(item.cateringLevyRate) || 0) / 100;
        const combinedTaxRate = vatRate + levyRate;
        const netSellingPrice = item.isTaxInclusive && combinedTaxRate > 0
            ? shelfPrice / (1 + combinedTaxRate)
            : shelfPrice;
        const basisPrice = params.taxBasis === 'NET' ? netSellingPrice : shelfPrice;
        const rec = recipeByMenuId.get(item.id) ?? null;
        let cogsPerPortion = 0;
        let hasCostBasis = false;
        let costSource = 'UNCOSTED';
        let yieldPortions = 1;
        let ingredientBreakdown = [];
        if (rec) {
            const recIngs = ingredientsByRecipeId.get(rec.id) ?? [];
            yieldPortions = Math.max(parseFloat(rec.yieldPortions) || 1, 0.01);
            let batchCogs = 0;
            ingredientBreakdown = recIngs.map((ing) => {
                const qty = parseFloat(ing.quantity) || 0;
                const unitCost = parseFloat(ing.unitCost) || 0;
                const wastage = parseFloat(ing.wastagePercentage) || 0;
                const perPortionLineCost = (qty * unitCost * (1 + wastage / 100)) / yieldPortions;
                batchCogs += qty * unitCost * (1 + wastage / 100);
                return {
                    id: ing.id,
                    ingredientName: ing.ingredientName,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    unitCost: ing.unitCost,
                    lineCost: Number(perPortionLineCost.toFixed(4)),
                    wastagePercentage: ing.wastagePercentage,
                };
            });
            cogsPerPortion = batchCogs / yieldPortions;
            hasCostBasis = recIngs.length > 0;
            if (hasCostBasis)
                costSource = 'RECIPE_BOM';
        }
        else if (item.stockTrackingType === 'STOCKED_PRODUCT' &&
            item.directInventoryItemId &&
            item.directInventoryCost !== null) {
            cogsPerPortion = parseFloat(item.directInventoryCost) || 0;
            hasCostBasis = true;
            costSource = 'DIRECT_STOCK';
            ingredientBreakdown = [
                {
                    id: item.directInventoryItemId,
                    ingredientName: item.directInventoryName || 'Linked Stocked Product',
                    quantity: '1',
                    unit: item.directInventoryUnit || 'pcs',
                    unitCost: item.directInventoryCost,
                    lineCost: cogsPerPortion,
                    wastagePercentage: '0.00',
                },
            ];
        }
        const grossProfit = basisPrice - cogsPerPortion;
        const marginPercent = basisPrice > 0 ? (grossProfit / basisPrice) * 100 : 0;
        const foodCostPercent = basisPrice > 0 ? (cogsPerPortion / basisPrice) * 100 : 0;
        // Recommended shelf price to hit target margin on the chosen tax basis
        const requiredNetPrice = cogsPerPortion > 0 ? cogsPerPortion / targetCostRatio : basisPrice;
        const recommendedShelfRaw = params.taxBasis === 'NET' && item.isTaxInclusive
            ? requiredNetPrice * (1 + combinedTaxRate)
            : requiredNetPrice;
        const targetPrice = cogsPerPortion > 0 ? Math.ceil(recommendedShelfRaw / 10) * 10 : shelfPrice;
        const sales = salesByMenuId.get(item.id) ?? { unitsSold: 0, grossSales: 0 };
        const itemPeriodContribution = hasCostBasis ? grossProfit * sales.unitsSold : 0;
        if (hasCostBasis) {
            costedDishesCount++;
            costedRevenueSum += basisPrice;
            costedCogsSum += cogsPerPortion;
            if (marginPercent >= params.alertThresholdPercent) {
                highMarginCount++;
            }
            else {
                lowMarginCount++;
            }
            if (sales.unitsSold > 0) {
                totalUnitsSold += sales.unitsSold;
                weightedNetRevenueSum += basisPrice * sales.unitsSold;
                weightedCogsSum += cogsPerPortion * sales.unitsSold;
                totalContributionMargin += itemPeriodContribution;
            }
        }
        return {
            menuItemId: item.id,
            itemName: item.name,
            sku: item.sku,
            category: item.categoryName || 'Uncategorized',
            stockTrackingType: item.stockTrackingType,
            costSource,
            yieldPortions,
            isTaxInclusive: item.isTaxInclusive,
            combinedTaxPercent: Number((combinedTaxRate * 100).toFixed(2)),
            retailPrice: Number(shelfPrice.toFixed(2)),
            netSellingPrice: Number(netSellingPrice.toFixed(2)),
            cogs: Number(cogsPerPortion.toFixed(2)),
            grossProfit: Number(grossProfit.toFixed(2)),
            marginPercent: Number(marginPercent.toFixed(1)),
            foodCostPercent: Number(foodCostPercent.toFixed(1)),
            targetPrice,
            hasRecipe: hasCostBasis,
            unitsSold: Number(sales.unitsSold.toFixed(2)),
            periodContributionMargin: Number(itemPeriodContribution.toFixed(2)),
            ingredients: ingredientBreakdown,
        };
    });
    // 5. Second pass: Kasavana & Smith Menu Engineering Classification (70% popularity rule)
    const soldCostedItems = rawAnalyzed.filter((i) => i.hasRecipe && i.unitsSold > 0);
    const avgContributionPerUnit = totalUnitsSold > 0 ? totalContributionMargin / totalUnitsSold : 0;
    const popularityBenchmark = soldCostedItems.length > 0 ? (1 / soldCostedItems.length) * 0.7 : 0;
    const analyzedItems = rawAnalyzed.map((item) => {
        let matrixClass = 'NO_SALES';
        if (item.hasRecipe && item.unitsSold > 0 && totalUnitsSold > 0) {
            const popularityShare = item.unitsSold / totalUnitsSold;
            const highPop = popularityShare >= popularityBenchmark;
            const highProfit = item.grossProfit >= avgContributionPerUnit;
            if (highPop && highProfit)
                matrixClass = 'STAR';
            else if (highPop && !highProfit)
                matrixClass = 'PLOWHORSE';
            else if (!highPop && highProfit)
                matrixClass = 'PUZZLE';
            else
                matrixClass = 'DOG';
        }
        return {
            ...item,
            matrixClass,
        };
    });
    const averageMargin = costedRevenueSum > 0
        ? Number((((costedRevenueSum - costedCogsSum) / costedRevenueSum) * 100).toFixed(1))
        : 0;
    const weightedFoodCostPercent = weightedNetRevenueSum > 0
        ? Number(((weightedCogsSum / weightedNetRevenueSum) * 100).toFixed(1))
        : costedRevenueSum > 0
            ? Number(((costedCogsSum / costedRevenueSum) * 100).toFixed(1))
            : 0;
    return {
        parameters: {
            targetMarginPercent: params.targetMarginPercent,
            alertThresholdPercent: params.alertThresholdPercent,
            periodDays: params.periodDays,
            taxBasis: params.taxBasis,
        },
        summary: {
            totalDishes: items.length,
            formulatedDishes: costedDishesCount,
            uncostedDishes: items.length - costedDishesCount,
            averageMargin,
            weightedFoodCostPercent,
            highMarginCount,
            lowMarginCount,
            totalCogs: Number(costedCogsSum.toFixed(2)),
            totalPeriodUnitsSold: Number(totalUnitsSold.toFixed(2)),
            totalContributionMargin: Number(totalContributionMargin.toFixed(2)),
        },
        items: analyzedItems,
    };
};
exports.computeTenantCostingMatrix = computeTenantCostingMatrix;
