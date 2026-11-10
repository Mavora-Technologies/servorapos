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
exports.exportSalesReport = exports.getSalesReport = void 0;
const salesRepo = __importStar(require("../repositories/sales-report.repository"));
const sales_report_validator_1 = require("../validators/sales-report.validator");
const getSalesReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = sales_report_validator_1.salesReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const [summary, paymentBreakdown, categoryBreakdown, branchBreakdown, topItems, timeline] = await Promise.all([
            salesRepo.getSalesSummaryMetrics(tenantId, query),
            salesRepo.getPaymentTenderBreakdown(tenantId, query),
            salesRepo.getCategorySalesBreakdown(tenantId, query),
            salesRepo.getBranchSalesBreakdown(tenantId, query),
            salesRepo.getTopSellingItems(tenantId, query),
            salesRepo.getSalesTrendTimeline(tenantId, query),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                summary,
                paymentBreakdown,
                categoryBreakdown,
                branchBreakdown,
                topItems,
                timeline,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to generate sales report' });
    }
};
exports.getSalesReport = getSalesReport;
const exportSalesReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = sales_report_validator_1.exportSalesReportSchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        if (query.exportType === 'PAYMENT_TENDERS') {
            const data = await salesRepo.getPaymentTenderBreakdown(tenantId, query);
            const csv = [
                ['Payment Method', 'Transactions', 'Total Collected (KES)'].join(','),
                ...data.map((d) => [`"${d.paymentMethod}"`, d.transactionCount, d.totalCollected.toFixed(2)].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=payment-tenders-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        if (query.exportType === 'LINE_ITEMS') {
            const items = await salesRepo.getTopSellingItems(tenantId, query, 100);
            const csv = [
                ['Item Name', 'Quantity Sold', 'Gross Revenue (KES)'].join(','),
                ...items.map((i) => [`"${i.itemName}"`, i.totalQuantitySold, i.totalRevenue.toFixed(2)].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=sales-items-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        const timeline = await salesRepo.getSalesTrendTimeline(tenantId, query);
        const csv = [
            ['Date/Bucket', 'Completed Orders', 'Net Sales (KES)', 'Tax Amount (KES)', 'Total Gross (KES)'].join(','),
            ...timeline.map((t) => [
                `"${t.timeBucket}"`,
                t.orderCount,
                t.netSales.toFixed(2),
                t.taxTotal.toFixed(2),
                t.grandTotal.toFixed(2),
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales-summary-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportSalesReport = exportSalesReport;
