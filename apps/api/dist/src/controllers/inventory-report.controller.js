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
exports.exportInventoryReport = exports.getInventoryReport = void 0;
const invRepo = __importStar(require("../repositories/inventory-report.repository"));
const inventory_report_validator_1 = require("../validators/inventory-report.validator");
const getInventoryReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = inventory_report_validator_1.inventoryReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const report = await invRepo.getInventoryReportMetrics(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: report,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate inventory report' });
    }
};
exports.getInventoryReport = getInventoryReport;
const exportInventoryReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = inventory_report_validator_1.exportInventoryReportSchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const report = await invRepo.getExportableInventoryReport(tenantId, query);
        if (query.exportType === 'WASTE_SCRAP_LEDGER') {
            const csv = [
                ['Cost Center / Department', 'Incidents Logged', 'Total Loss Cost (KES)'].join(','),
                ...report.departmentalWaste.map((w) => [`"${w.department}"`, w.incidentCount, w.totalLossCost.toFixed(2)].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=waste-scrap-ledger-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        if (query.exportType === 'BATCH_EXPIRY_SCHEDULE') {
            const csv = [
                ['Batch Number', 'Item Name', 'Quantity Remaining', 'Unit Cost (KES)', 'Expiry Date', 'Days Left', 'At-Risk Valuation (KES)'].join(','),
                ...report.expiringBatches.map((b) => [
                    `"${b.batchNumber}"`,
                    `"${b.itemName.replace(/"/g, '""')}"`,
                    b.currentQuantity.toFixed(2),
                    b.unitCost.toFixed(2),
                    `"${new Date(b.expiryDate).toISOString().split('T')[0]}"`,
                    b.daysRemaining,
                    b.atRiskValuation.toFixed(2),
                ].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=batch-expiry-schedule-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        // Default: Stock on Hand Master Matrix
        const csv = [
            [
                'Item Name',
                'SKU',
                'Category',
                'Material Type',
                'Stock Level',
                'Base Unit',
                'Unit Cost (KES)',
                'Total Valuation (KES)',
                'Min Threshold',
                'Reorder Quantity',
                'Condition',
                'Stock Status',
            ].join(','),
            ...report.items.map((i) => [
                `"${i.name.replace(/"/g, '""')}"`,
                `"${i.sku || 'N/A'}"`,
                `"${i.category}"`,
                i.materialType,
                i.currentStock.toFixed(2),
                i.unit,
                i.costPrice.toFixed(2),
                i.totalValuation.toFixed(2),
                i.minThreshold.toFixed(2),
                i.reorderQuantity.toFixed(2),
                i.storageCondition,
                i.healthStatus,
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=stock-on-hand-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportInventoryReport = exportInventoryReport;
