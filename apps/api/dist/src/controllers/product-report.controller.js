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
exports.exportProductReport = exports.getProductReport = void 0;
const productRepo = __importStar(require("../repositories/product-report.repository"));
const product_report_validator_1 = require("../validators/product-report.validator");
const getProductReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = product_report_validator_1.productReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const report = await productRepo.getProductReportMetrics(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: report,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to generate product report' });
    }
};
exports.getProductReport = getProductReport;
const exportProductReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = product_report_validator_1.exportProductReportSchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const report = await productRepo.getExportableProductReport(tenantId, query);
        if (query.exportType === 'CATEGORY_BREAKDOWN') {
            const csv = [
                ['Category', 'Units Sold', 'Gross Revenue (KES)', 'Gross Margin (KES)', 'Margin %'].join(','),
                ...report.categoryBreakdown.map((c) => [
                    `"${c.categoryName}"`,
                    c.unitsSold,
                    c.grossRevenue.toFixed(2),
                    c.grossProfit.toFixed(2),
                    `${c.marginPercent}%`,
                ].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=category-performance-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        // Default: Product Matrix
        const csv = [
            [
                'Item Name',
                'SKU',
                'Category',
                'Tracking Type',
                'Units Sold',
                'Avg Price (KES)',
                'Revenue (KES)',
                'COGS (KES)',
                'Gross Profit (KES)',
                'Margin %',
                'Food Cost %',
                'Classification',
            ].join(','),
            ...report.items.map((i) => [
                `"${i.itemName.replace(/"/g, '""')}"`,
                `"${i.sku}"`,
                `"${i.categoryName}"`,
                i.stockTrackingType,
                i.quantitySold,
                i.avgSellingPrice.toFixed(2),
                i.grossRevenue.toFixed(2),
                i.totalCost.toFixed(2),
                i.grossProfit.toFixed(2),
                `${i.marginPercent}%`,
                `${i.foodCostPercent}%`,
                i.matrixClassification,
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=product-performance-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportProductReport = exportProductReport;
