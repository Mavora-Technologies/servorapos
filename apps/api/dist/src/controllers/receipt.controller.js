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
exports.setDefault = exports.deleteTemplate = exports.putTemplate = exports.postTemplate = exports.getTemplates = void 0;
const receiptRepo = __importStar(require("../repositories/receipt.repository"));
const receipt_validator_1 = require("../validators/receipt.validator");
const getTemplates = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const templates = await receiptRepo.listReceiptTemplates(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: templates });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch receipt templates' });
    }
};
exports.getTemplates = getTemplates;
const postTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = receipt_validator_1.createReceiptTemplateSchema.parse(req.body);
        const created = await receiptRepo.createReceiptTemplate(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Receipt format specification saved successfully.',
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
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create template' });
    }
};
exports.postTemplate = postTemplate;
const putTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const templateId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(templateId)) {
            res.status(400).json({ status: 'error', message: 'Invalid template identifier' });
            return;
        }
        const input = receipt_validator_1.updateReceiptTemplateSchema.parse(req.body);
        const updated = await receiptRepo.updateReceiptTemplate(tenantId, templateId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Receipt layout customizer updated.',
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
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update template' });
    }
};
exports.putTemplate = putTemplate;
const deleteTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const templateId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(templateId)) {
            res.status(400).json({ status: 'error', message: 'Invalid template identifier' });
            return;
        }
        await receiptRepo.deleteReceiptTemplate(tenantId, templateId);
        res.status(200).json({ status: 'success', message: 'Receipt template removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete template' });
    }
};
exports.deleteTemplate = deleteTemplate;
const setDefault = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { templateId, branchId } = receipt_validator_1.setDefaultTemplateSchema.parse(req.body);
        const updated = await receiptRepo.setAsDefaultTemplate(tenantId, templateId, branchId);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Primary default printing layout assigned.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to set default template' });
    }
};
exports.setDefault = setDefault;
