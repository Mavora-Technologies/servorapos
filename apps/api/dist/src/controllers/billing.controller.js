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
exports.postSettleInvoice = exports.postSetDefaultPaymentMethod = exports.deletePaymentMethod = exports.postPaymentMethod = exports.getInvoices = exports.putSubscription = exports.getBillingDetails = void 0;
const zod_1 = require("zod");
const billingService = __importStar(require("../services/billing.service"));
const billing_validator_1 = require("../validators/billing.validator");
const getBillingDetails = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const overview = await billingService.fetchTenantBillingOverview(tenantId);
        res.status(200).json({ status: 'success', data: overview });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch billing details';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getBillingDetails = getBillingDetails;
const putSubscription = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = billing_validator_1.updateSubscriptionPlanSchema.parse(req.body);
        const result = await billingService.saveTenantSubscription(tenantId, input);
        res.status(200).json({
            status: 'success',
            data: result.subscription,
            invoice: result.invoice,
            message: result.invoice
                ? `Subscription updated and invoice ${result.invoice.invoiceNumber} issued.`
                : 'Subscription plan and licensing allocation updated.',
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
        const message = error instanceof Error ? error.message : 'Failed to update subscription';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putSubscription = putSubscription;
const getInvoices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = billing_validator_1.listInvoicesQuerySchema.parse(req.query);
        const result = await billingService.fetchTenantInvoices(tenantId, query);
        res.status(200).json({
            status: 'success',
            data: result.invoices,
            pagination: result.pagination,
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid invoice filter query',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to retrieve invoices';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getInvoices = getInvoices;
const postPaymentMethod = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = billing_validator_1.addPaymentMethodSchema.parse(req.body);
        const method = await billingService.registerPaymentMethod(tenantId, input);
        res.status(201).json({
            status: 'success',
            data: method,
            message: 'Payment mandate registered successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to add payment method';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postPaymentMethod = postPaymentMethod;
const deletePaymentMethod = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const methodId = Number(req.params.id);
        if (!Number.isInteger(methodId) || methodId <= 0) {
            res.status(400).json({ status: 'error', message: 'Valid payment method ID required' });
            return;
        }
        const deleted = await billingService.removePaymentMethod(tenantId, methodId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Payment method mandate not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Payment method removed.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete payment method';
        res.status(400).json({ status: 'error', message });
    }
};
exports.deletePaymentMethod = deletePaymentMethod;
const postSetDefaultPaymentMethod = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const methodId = Number(req.params.id);
        if (!Number.isInteger(methodId) || methodId <= 0) {
            res.status(400).json({ status: 'error', message: 'Valid payment method ID required' });
            return;
        }
        const updated = await billingService.markDefaultPaymentMethod(tenantId, methodId);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Payment method mandate not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Primary payment mandate updated.',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update default payment method';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postSetDefaultPaymentMethod = postSetDefaultPaymentMethod;
const postSettleInvoice = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = billing_validator_1.settleInvoiceSchema.parse(req.body);
        const settled = await billingService.processInvoiceSettlement(tenantId, input);
        if (!settled) {
            res.status(404).json({ status: 'error', message: 'Invoice not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: settled,
            message: `Invoice ${settled.invoiceNumber} marked as settled.`,
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
        const message = error instanceof Error ? error.message : 'Failed to settle invoice';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postSettleInvoice = postSettleInvoice;
