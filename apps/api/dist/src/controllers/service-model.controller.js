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
exports.deleteServiceModel = exports.patchServiceModelStatus = exports.putServiceModel = exports.postServiceModel = exports.getServiceModels = void 0;
const serviceModelRepo = __importStar(require("../repositories/service-model.repository"));
const service_model_validator_1 = require("../validators/service-model.validator");
const getServiceModels = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const models = await serviceModelRepo.listServiceModels(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: models });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch service models' });
    }
};
exports.getServiceModels = getServiceModels;
const postServiceModel = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = service_model_validator_1.createServiceModelSchema.parse(req.body);
        const created = await serviceModelRepo.createServiceModel(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Service model workflow provisioned successfully.',
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
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create service model' });
    }
};
exports.postServiceModel = postServiceModel;
const putServiceModel = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const modelId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(modelId)) {
            res.status(400).json({ status: 'error', message: 'Invalid service model identifier' });
            return;
        }
        const input = service_model_validator_1.updateServiceModelSchema.parse(req.body);
        const updated = await serviceModelRepo.updateServiceModel(tenantId, modelId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Service model configuration updated.',
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
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update service model' });
    }
};
exports.putServiceModel = putServiceModel;
const patchServiceModelStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const modelId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(modelId)) {
            res.status(400).json({ status: 'error', message: 'Invalid service model identifier' });
            return;
        }
        const { isActive } = service_model_validator_1.toggleServiceModelStatusSchema.parse(req.body);
        const updated = await serviceModelRepo.updateServiceModel(tenantId, modelId, { isActive });
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Service model ${isActive ? 'activated' : 'deactivated'}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to toggle status' });
    }
};
exports.patchServiceModelStatus = patchServiceModelStatus;
const deleteServiceModel = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const modelId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(modelId)) {
            res.status(400).json({ status: 'error', message: 'Invalid service model identifier' });
            return;
        }
        await serviceModelRepo.deleteServiceModel(tenantId, modelId);
        res.status(200).json({ status: 'success', message: 'Service model removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete service model' });
    }
};
exports.deleteServiceModel = deleteServiceModel;
