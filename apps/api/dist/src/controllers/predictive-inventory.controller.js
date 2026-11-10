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
exports.postDismissRecommendation = exports.postConvertToPO = exports.getPredictiveInventoryOverview = void 0;
const predRepo = __importStar(require("../repositories/predictive-inventory.repository"));
const predictive_inventory_validator_1 = require("../validators/predictive-inventory.validator");
const getPredictiveInventoryOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = predictive_inventory_validator_1.predictiveInventoryQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const data = await predRepo.getPredictivePurchasingTelemetry(tenantId, parseResult.data);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate predictive inventory telemetry' });
    }
};
exports.getPredictiveInventoryOverview = getPredictiveInventoryOverview;
const postConvertToPO = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = predictive_inventory_validator_1.convertToPurchaseOrderSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await predRepo.convertRecommendationToPO(tenantId, userId, parseResult.data);
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Conversion to purchase order failed' });
    }
};
exports.postConvertToPO = postConvertToPO;
const postDismissRecommendation = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = predictive_inventory_validator_1.dismissRecommendationSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid dismissal parameters' });
            return;
        }
        const dismissed = await predRepo.dismissReplenishmentRecommendation(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: dismissed,
            message: 'Recommendation dismissed and logged for historical regression review.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Dismissal failed' });
    }
};
exports.postDismissRecommendation = postDismissRecommendation;
