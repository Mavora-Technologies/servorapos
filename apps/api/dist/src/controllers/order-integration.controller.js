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
exports.postTestSync = exports.deleteOrderIntegration = exports.putOrderIntegration = exports.postOrderIntegration = exports.getOrderIntegrations = void 0;
const orderRepo = __importStar(require("../repositories/order-integration.repository"));
const order_integration_validator_1 = require("../validators/order-integration.validator");
const getOrderIntegrations = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const [integrations, logs] = await Promise.all([
            orderRepo.listOrderIntegrations(tenantId, branchIdNum),
            orderRepo.listRecentOrderLogs(tenantId),
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
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch order integrations' });
    }
};
exports.getOrderIntegrations = getOrderIntegrations;
const postOrderIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = order_integration_validator_1.createOrderIntegrationSchema.parse(req.body);
        const created = await orderRepo.createOrderIntegration(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Third-party order channel integration provisioned successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create order integration' });
    }
};
exports.postOrderIntegration = postOrderIntegration;
const putOrderIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const integrationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(integrationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
            return;
        }
        const input = order_integration_validator_1.updateOrderIntegrationSchema.parse(req.body);
        const updated = await orderRepo.updateOrderIntegration(tenantId, integrationId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Order channel configuration updated.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailedMessage, errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update order integration' });
    }
};
exports.putOrderIntegration = putOrderIntegration;
const deleteOrderIntegration = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const integrationId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(integrationId)) {
            res.status(400).json({ status: 'error', message: 'Invalid integration identifier' });
            return;
        }
        await orderRepo.deleteOrderIntegration(tenantId, integrationId);
        res.status(200).json({ status: 'success', message: 'Order integration profile removed.' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to delete order integration' });
    }
};
exports.deleteOrderIntegration = deleteOrderIntegration;
const postTestSync = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { integrationId } = order_integration_validator_1.testSyncSchema.parse(req.body);
        const result = await orderRepo.executeOrderSyncHandshake(tenantId, integrationId);
        res.status(200).json({
            status: 'success',
            data: result,
            message: result.message,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Channel sync failed' });
    }
};
exports.postTestSync = postTestSync;
