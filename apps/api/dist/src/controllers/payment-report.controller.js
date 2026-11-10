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
exports.exportPaymentReport = exports.getPaymentReport = void 0;
const paymentRepo = __importStar(require("../repositories/payment-report.repository"));
const payment_report_validator_1 = require("../validators/payment-report.validator");
const getPaymentReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = payment_report_validator_1.paymentReportQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const report = await paymentRepo.getPaymentReportMetrics(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: report,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate payment report' });
    }
};
exports.getPaymentReport = getPaymentReport;
const exportPaymentReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = payment_report_validator_1.exportPaymentReportSchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const report = await paymentRepo.getExportablePaymentReport(tenantId, query);
        if (query.exportType === 'CLEARING_ACCOUNTS') {
            const csv = [
                ['Clearing Account', 'Transaction Count', 'Inflow AR (KES)', 'Outflow AP (KES)', 'Net Liquidity (KES)'].join(','),
                ...report.clearingAccounts.map((c) => [
                    `"${c.accountName}"`,
                    c.transactionCount,
                    c.inflow.toFixed(2),
                    c.outflow.toFixed(2),
                    c.netBalance.toFixed(2),
                ].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=clearing-accounts-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        if (query.exportType === 'DAILY_TENDER_SUMMARY') {
            const csv = [
                ['Date/Bucket', 'Transaction Count', 'Total Inflow (KES)', 'Total Outflow (KES)', 'Net Cash (KES)'].join(','),
                ...report.timeline.map((t) => [
                    `"${t.timeBucket}"`,
                    t.transactionCount,
                    t.inflow.toFixed(2),
                    t.outflow.toFixed(2),
                    t.netCash.toFixed(2),
                ].join(',')),
            ].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=daily-tender-summary-${Date.now()}.csv`);
            res.status(200).send(csv);
            return;
        }
        // Default: Ledger Transactions
        const csv = [
            [
                'Payment Number',
                'Flow',
                'Method',
                'Clearing Account',
                'Reference Code',
                'Amount (KES)',
                'Party / Order',
                'Branch',
                'Status',
                'Reconciled',
                'Timestamp',
            ].join(','),
            ...report.ledger.map((tx) => [
                `"${tx.paymentNumber}"`,
                tx.paymentFlow,
                `"${tx.paymentMethod}"`,
                `"${tx.clearingAccount}"`,
                `"${tx.transactionReference}"`,
                tx.amount.toFixed(2),
                `"${tx.partyIdentifier}"`,
                `"${tx.branchName}"`,
                tx.status,
                tx.isReconciled ? 'YES' : 'NO',
                `"${new Date(tx.createdAt).toISOString()}"`,
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=treasury-ledger-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportPaymentReport = exportPaymentReport;
