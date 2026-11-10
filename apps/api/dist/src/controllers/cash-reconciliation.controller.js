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
exports.postAuditResolution = exports.getReconciliationAuditList = exports.getReconciliationTelemetry = void 0;
const reconRepo = __importStar(require("../repositories/cash-reconciliation.repository"));
const cash_reconciliation_validator_1 = require("../validators/cash-reconciliation.validator");
const getReconciliationTelemetry = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const dateStr = req.query.date ? String(req.query.date) : undefined;
        const data = await reconRepo.getReconciliationDailyTelemetry(tenantId, branchId, dateStr);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate reconciliation telemetry' });
    }
};
exports.getReconciliationTelemetry = getReconciliationTelemetry;
const getReconciliationAuditList = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = cash_reconciliation_validator_1.reconciliationQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid query parameters', errors: parseResult.error.issues });
            return;
        }
        const data = await reconRepo.listReconciliationAuditRecords(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list reconciliation records' });
    }
};
exports.getReconciliationAuditList = getReconciliationAuditList;
const postAuditResolution = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const supervisorId = req.user?.userId;
        if (!tenantId || !supervisorId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = cash_reconciliation_validator_1.performReconciliationAuditSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid audit payload', errors: parseResult.error.issues });
            return;
        }
        const result = await reconRepo.submitSupervisorAuditResolution(tenantId, supervisorId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Audit resolution signed off for shift #${parseResult.data.shiftId}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to sign off audit resolution' });
    }
};
exports.postAuditResolution = postAuditResolution;
