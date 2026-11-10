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
exports.deleteTemplate = exports.putTemplate = exports.postTemplate = exports.postTestDispatch = exports.deleteIntegration = exports.putIntegration = exports.postIntegration = exports.getMessagingSettings = void 0;
const messagingRepo = __importStar(require("../repositories/messaging-integration.repository"));
const messaging_integration_validator_1 = require("../validators/messaging-integration.validator");
const getMessagingSettings = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const [integrations, templates, logs] = await Promise.all([
            messagingRepo.listMessagingIntegrations(tenantId, branchIdNum),
            messagingRepo.listMessagingTemplates(tenantId),
            messagingRepo.listRecentDispatchLogs(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                integrations,
                templates,
                logs,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch messaging configurations' });
    }
};
exports.getMessagingSettings = getMessagingSettings;
const postIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = messaging_integration_validator_1.createMessagingIntegrationSchema.parse(req.body);
        const created = await messagingRepo.createMessagingIntegration(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Messaging gateway integration registered successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create messaging integration' });
    }
};
exports.postIntegration = postIntegration;
const putIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const integrationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(integrationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
            return;
        }
        const input = messaging_integration_validator_1.updateMessagingIntegrationSchema.parse(req.body);
        const updated = await messagingRepo.updateMessagingIntegration(tenantId, integrationId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Messaging gateway configuration updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update messaging integration' });
    }
};
exports.putIntegration = putIntegration;
const deleteIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const integrationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(integrationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
            return;
        }
        await messagingRepo.deleteMessagingIntegration(tenantId, integrationId);
        res.status(200).json({ status: 'success', message: 'Messaging gateway profile removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete messaging integration' });
    }
};
exports.deleteIntegration = deleteIntegration;
const postTestDispatch = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { integrationId, recipient, message } = messaging_integration_validator_1.testDispatchSchema.parse(req.body);
        const result = await messagingRepo.testMessagingDispatch(tenantId, integrationId, recipient, message);
        res.status(200).json({
            status: 'success',
            data: result,
            message: result.message,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Test dispatch failed' });
    }
};
exports.postTestDispatch = postTestDispatch;
const postTemplate = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = messaging_integration_validator_1.createMessagingTemplateSchema.parse(req.body);
        const created = await messagingRepo.createMessagingTemplate(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Notification template created successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
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
        const input = messaging_integration_validator_1.updateMessagingTemplateSchema.parse(req.body);
        const updated = await messagingRepo.updateMessagingTemplate(tenantId, templateId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Notification template updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
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
        await messagingRepo.deleteMessagingTemplate(tenantId, templateId);
        res.status(200).json({ status: 'success', message: 'Template removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete template' });
    }
};
exports.deleteTemplate = deleteTemplate;
