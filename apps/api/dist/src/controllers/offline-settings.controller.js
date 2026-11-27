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
exports.postSyncOfflineBatch = exports.putSettings = exports.getSettings = void 0;
const zod_1 = require("zod");
const offlineService = __importStar(require("../services/offline-settings.service"));
const offline_settings_validator_1 = require("../validators/offline-settings.validator");
const getSettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const rawBranch = req.query.branchId;
        const branchIdNum = typeof rawBranch === 'string' && rawBranch !== 'ALL' && /^\d+$/.test(rawBranch)
            ? parseInt(rawBranch, 10)
            : undefined;
        const data = await offlineService.fetchOfflineOverview(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch offline settings';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getSettings = getSettings;
const putSettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = offline_settings_validator_1.updateOfflineSettingsSchema.parse(req.body);
        const updated = await offlineService.saveOfflineSettings(tenantId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Offline survivability and sync policies saved.',
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
        const message = error instanceof Error ? error.message : 'Failed to update offline settings';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putSettings = putSettings;
const postSyncOfflineBatch = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = offline_settings_validator_1.syncOfflineBatchSchema.parse(req.body);
        const result = await offlineService.reconcileOfflineBatch(tenantId, req.user?.userId ?? null, req.user?.defaultBranchId ?? null, input);
        res.status(200).json({
            status: 'success',
            data: result,
            message: result.alreadyProcessed
                ? `Batch ${result.batch.batchReference} was already reconciled.`
                : `Batch ${result.batch.batchReference} reconciled ${result.batch.recordCount} order(s) with ${result.batch.conflictCount} conflict(s).`,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid offline sync batch payload',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Offline batch reconciliation failed';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postSyncOfflineBatch = postSyncOfflineBatch;
