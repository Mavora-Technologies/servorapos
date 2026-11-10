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
exports.exportFoodCostingReport = exports.getFoodCostingReport = void 0;
const foodCostRepo = __importStar(require("../repositories/food-costing-report.repository"));
const food_costing_report_validator_1 = require("../validators/food-costing-report.validator");
const getFoodCostingReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = food_costing_report_validator_1.foodCostingReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const report = await foodCostRepo.getFoodCostingReportMetrics(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: report,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to generate food costing report' });
    }
};
exports.getFoodCostingReport = getFoodCostingReport;
const exportFoodCostingReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = food_costing_report_validator_1.exportFoodCostingReportSchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const report = await foodCostRepo.getExportableFoodCostingReport(tenantId, query);
        if (query.exportType === 'CATEGORY_MARGIN_SUMMARY') {
            const csv = [
                ['Category', 'Costed Recipes', 'Avg Selling Price (KES)', 'Avg Portion Cost (KES)', 'Food Cost %'].join(','),
                ...report.categoryCostSummary.map((c) => [
                    `"${c.category}"`,
                    c.recipeCount,
                    c.avgPortionPrice.toFixed(2),
                    c.avgPortionCost.toFixed(2),
                    `${c.categoryFoodCostPercent}%`,
                ].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=category-food-cost-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        // Default: Detailed Recipe BOM Ledger
        const csv = [
            [
                'Menu Item',
                'SKU',
                'Category',
                'Kitchen Station',
                'Selling Price (KES)',
                'Portion Cost (KES)',
                'Gross Margin (KES)',
                'Food Cost %',
                'Gross Margin %',
                'Cost Health',
                'Units Sold',
                'Cost of Sales (KES)',
            ].join(','),
            ...report.items.map((i) => [
                `"${i.name.replace(/"/g, '""')}"`,
                `"${i.sku}"`,
                `"${i.categoryName}"`,
                i.kitchenStation,
                i.sellingPrice.toFixed(2),
                i.theoreticalPortionCost.toFixed(2),
                i.grossProfit.toFixed(2),
                `${i.foodCostPercent}%`,
                `${i.grossMarginPercent}%`,
                i.costHealth,
                i.unitsSoldPeriod,
                i.totalCostOfSalesPeriod.toFixed(2),
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=recipe-food-costing-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportFoodCostingReport = exportFoodCostingReport;
