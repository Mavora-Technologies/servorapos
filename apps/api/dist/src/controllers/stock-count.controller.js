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
exports.reconcileStockCount = exports.updateStockCountLine = exports.initiateStockCount = exports.getStockCountDetails = exports.getStockCounts = void 0;
const zod_1 = require("zod");
const stockCountService = __importStar(require("../services/stock-count.service"));
const stock_count_validator_1 = require("../validators/stock-count.validator");
const getStockCounts = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const counts = await stockCountService.listTenantStockCounts(tenantId);
        res.status(200).json({ status: 'success', data: counts });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch stock counts';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getStockCounts = getStockCounts;
const getStockCountDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const countId = Number(req.params.id);
        if (!Number.isInteger(countId) || countId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid stock count ID' });
            return;
        }
        const details = await stockCountService.fetchStockCountSheet(tenantId, countId);
        if (!details) {
            res.status(404).json({ status: 'error', message: 'Stock count not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: details });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch audit sheet';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getStockCountDetails = getStockCountDetails;
const initiateStockCount = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = stock_count_validator_1.initiateStockCountSchema.parse(req.body);
        const branchId = req.user?.defaultBranchId ?? null;
        const userId = req.user?.userId ?? null;
        const result = await stockCountService.startStockCountSession(tenantId, branchId, userId, payload);
        res.status(201).json({ status: 'success', data: result });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to initiate stock count';
        res.status(400).json({ status: 'error', message });
    }
};
exports.initiateStockCount = initiateStockCount;
const updateStockCountLine = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const lineId = Number(req.params.itemId);
        if (!Number.isInteger(lineId) || lineId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid count line ID' });
            return;
        }
        const payload = stock_count_validator_1.updateCountLineSchema.parse(req.body);
        const updated = await stockCountService.recordPhysicalCountLine(tenantId, lineId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Count line not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to update count line';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateStockCountLine = updateStockCountLine;
const reconcileStockCount = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const countId = Number(req.params.id);
        if (!Number.isInteger(countId) || countId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid stock count ID' });
            return;
        }
        const payload = stock_count_validator_1.reconcileStockCountSchema.parse(req.body);
        const branchId = req.user?.defaultBranchId ?? null;
        const userId = req.user?.userId ?? null;
        const result = await stockCountService.finalizeStockCountReconciliation(tenantId, branchId, userId, countId, payload);
        res.status(200).json({
            status: 'success',
            message: `Stocktake ${result.countNumber} reconciled. Inventory variances posted to the material ledger.`,
            data: result,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to reconcile stock count';
        res.status(400).json({ status: 'error', message });
    }
};
exports.reconcileStockCount = reconcileStockCount;
