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
exports.postTestHandshake = exports.deletePaymentIntegration = exports.putPaymentIntegration = exports.postPaymentIntegration = exports.getPaymentIntegrations = void 0;
const paymentRepo = __importStar(require("../repositories/payment-integration.repository"));
const payment_integration_validator_1 = require("../validators/payment-integration.validator");
const getPaymentIntegrations = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const [integrations, logs] = await Promise.all([
            paymentRepo.listPaymentIntegrations(tenantId, branchIdNum),
            paymentRepo.listRecentWebhookLogs(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                integrations,
                logs,
            },
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch payment integrations' });
    }
};
exports.getPaymentIntegrations = getPaymentIntegrations;
const postPaymentIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = payment_integration_validator_1.createPaymentIntegrationSchema.parse(req.body);
        const created = await paymentRepo.createPaymentIntegration(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Payment gateway integration configured successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create payment integration' });
    }
};
exports.postPaymentIntegration = postPaymentIntegration;
const putPaymentIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const integrationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(integrationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
            return;
        }
        const input = payment_integration_validator_1.updatePaymentIntegrationSchema.parse(req.body);
        const updated = await paymentRepo.updatePaymentIntegration(tenantId, integrationId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Payment gateway parameters updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update payment integration' });
    }
};
exports.putPaymentIntegration = putPaymentIntegration;
const deletePaymentIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const integrationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(integrationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
            return;
        }
        await paymentRepo.deletePaymentIntegration(tenantId, integrationId);
        res.status(200).json({ status: 'success', message: 'Payment gateway profile removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete payment integration' });
    }
};
exports.deletePaymentIntegration = deletePaymentIntegration;
const postTestHandshake = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { integrationId } = payment_integration_validator_1.testHandshakeSchema.parse(req.body);
        const result = await paymentRepo.executeGatewayHandshake(tenantId, integrationId);
        res.status(200).json({
            status: 'success',
            data: result,
            message: result.message,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Handshake failed' });
    }
};
exports.postTestHandshake = postTestHandshake;
