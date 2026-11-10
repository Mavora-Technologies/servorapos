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
exports.putGlobalSettings = exports.deleteKitchenStation = exports.putKitchenStation = exports.postKitchenStation = exports.getKitchenSettings = void 0;
const kitchenRepo = __importStar(require("../repositories/kitchen-settings.repository"));
const kitchen_settings_validator_1 = require("../validators/kitchen-settings.validator");
const getKitchenSettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const payload = await kitchenRepo.getKitchenSettingsPayload(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: payload });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch kitchen settings' });
    }
};
exports.getKitchenSettings = getKitchenSettings;
const postKitchenStation = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = kitchen_settings_validator_1.createKitchenStationSchema.parse(req.body);
        const created = await kitchenRepo.createKitchenStation(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'KDS preparation station configured successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to register station' });
    }
};
exports.postKitchenStation = postKitchenStation;
const putKitchenStation = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const stationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(stationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid station identifier' });
            return;
        }
        const input = kitchen_settings_validator_1.updateKitchenStationSchema.parse(req.body);
        const updated = await kitchenRepo.updateKitchenStation(tenantId, stationId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'KDS station configuration updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update station' });
    }
};
exports.putKitchenStation = putKitchenStation;
const deleteKitchenStation = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const stationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(stationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid station identifier' });
            return;
        }
        await kitchenRepo.deleteKitchenStation(tenantId, stationId);
        res.status(200).json({ status: 'success', message: 'KDS station removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete station' });
    }
};
exports.deleteKitchenStation = deleteKitchenStation;
const putGlobalSettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = kitchen_settings_validator_1.updateKitchenGlobalSettingsSchema.parse(req.body);
        const updated = await kitchenRepo.updateKitchenGlobalSettings(tenantId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Global culinary SLA and expediter parameters saved.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update kitchen SLA parameters' });
    }
};
exports.putGlobalSettings = putGlobalSettings;
