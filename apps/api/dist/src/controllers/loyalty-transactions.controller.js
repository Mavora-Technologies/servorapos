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
exports.exportLoyaltyTransactionsReport = exports.getLoyaltyTransactionsReport = void 0;
const loyaltyTxRepo = __importStar(require("../repositories/loyalty-transactions.repository"));
const loyalty_transactions_validator_1 = require("../validators/loyalty-transactions.validator");
const getLoyaltyTransactionsReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_transactions_validator_1.loyaltyTransactionsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const report = await loyaltyTxRepo.getLoyaltyTransactionsMetrics(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: report,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch loyalty transaction audit log' });
    }
};
exports.getLoyaltyTransactionsReport = getLoyaltyTransactionsReport;
const exportLoyaltyTransactionsReport = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_transactions_validator_1.exportLoyaltyTransactionsSchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const query = parseResult.data;
        const report = await loyaltyTxRepo.getExportableLoyaltyTransactions(tenantId, query);
        const csv = [
            [
                'Audit Reference',
                'Customer Name',
                'Phone',
                'Entry Type',
                'Points Delta',
                'Monetary Value (KES)',
                'Balance Before',
                'Balance After',
                'Channel',
                'Branch',
                'Operator',
                'Timestamp',
            ].join(','),
            ...report.transactions.map((tx) => [
                `"${tx.auditReference || 'N/A'}"`,
                `"${tx.customerName}"`,
                `"${tx.customerPhone}"`,
                tx.entryType,
                tx.pointsDelta,
                tx.monetaryValueKes.toFixed(2),
                tx.balanceBefore,
                tx.balanceAfter,
                tx.channel,
                `"${tx.branchName}"`,
                `"${tx.processedByName}"`,
                `"${new Date(tx.createdAt).toISOString()}"`,
            ].join(',')),
        ].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=loyalty-ledger-audit-${Date.now()}.csv`);
        res.status(200).send(csv);
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Export failed' });
    }
};
exports.exportLoyaltyTransactionsReport = exportLoyaltyTransactionsReport;
