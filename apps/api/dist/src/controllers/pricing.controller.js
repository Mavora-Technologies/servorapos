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
exports.deletePricingRule = exports.updatePricingRule = exports.createPricingRule = exports.bulkUpdatePrices = exports.getPricingOverview = void 0;
const zod_1 = require("zod");
const pricingService = __importStar(require("../services/pricing.service"));
const pricing_validator_1 = require("../validators/pricing.validator");
const getPricingOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const data = await pricingService.fetchTenantPricingOverview(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch pricing data';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getPricingOverview = getPricingOverview;
const bulkUpdatePrices = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const { updates } = pricing_validator_1.bulkUpdatePricesSchema.parse(req.body);
        const result = await pricingService.saveBulkBasePrices(tenantId, updates);
        res.status(200).json({
            status: 'success',
            message: `Updated ${result.updatedCount} base price(s) successfully.`,
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
        const message = error instanceof Error ? error.message : 'Failed to update base prices';
        res.status(400).json({ status: 'error', message });
    }
};
exports.bulkUpdatePrices = bulkUpdatePrices;
const createPricingRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = pricing_validator_1.createPricingRuleSchema.parse(req.body);
        const branchId = req.user?.defaultBranchId ?? null;
        const rule = await pricingService.registerPricingRule(tenantId, branchId, payload);
        res.status(201).json({ status: 'success', data: rule });
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
        const message = error instanceof Error ? error.message : 'Failed to create pricing rule';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createPricingRule = createPricingRule;
const updatePricingRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const ruleId = Number(req.params.id);
        if (!Number.isInteger(ruleId) || ruleId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid pricing rule ID' });
            return;
        }
        const payload = pricing_validator_1.updatePricingRuleSchema.parse(req.body);
        const updated = await pricingService.modifyPricingRule(tenantId, ruleId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Pricing rule not found' });
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
        const message = error instanceof Error ? error.message : 'Failed to update pricing rule';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updatePricingRule = updatePricingRule;
const deletePricingRule = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const ruleId = Number(req.params.id);
        if (!Number.isInteger(ruleId) || ruleId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid pricing rule ID' });
            return;
        }
        const deleted = await pricingService.removePricingRule(tenantId, ruleId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Pricing rule not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Pricing rule deleted successfully' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete pricing rule';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deletePricingRule = deletePricingRule;
