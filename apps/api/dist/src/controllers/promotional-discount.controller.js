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
exports.postValidatePromoCode = exports.patchPromotion = exports.postPromotion = exports.getPromotions = exports.getPromotionsOverview = void 0;
const promoRepo = __importStar(require("../repositories/promotional-discount.repository"));
const promotional_discount_validator_1 = require("../validators/promotional-discount.validator");
const getPromotionsOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await promoRepo.getPromotionsDashboardMetrics(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate promotions telemetry' });
    }
};
exports.getPromotionsOverview = getPromotionsOverview;
const getPromotions = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = promotional_discount_validator_1.listPromotionsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await promoRepo.listTenantPromotions(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.promotions,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list promotional discounts' });
    }
};
exports.getPromotions = getPromotions;
const postPromotion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = promotional_discount_validator_1.createPromotionSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await promoRepo.createPromotionRecord(tenantId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Promo code "${created.code}" registered and ready for checkout redemption.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to register promotional discount' });
    }
};
exports.postPromotion = postPromotion;
const patchPromotion = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const promoId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(promoId)) {
            res.status(400).json({ status: 'error', message: 'Valid promotion ID required' });
            return;
        }
        const parseResult = promotional_discount_validator_1.updatePromotionSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await promoRepo.updatePromotionRecord(tenantId, promoId, parseResult.data);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Promotion not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Promotion "${updated.code}" updated successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update promotion' });
    }
};
exports.patchPromotion = patchPromotion;
const postValidatePromoCode = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = promotional_discount_validator_1.validatePromoCodeSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const verification = await promoRepo.validatePromoCodeRule(tenantId, parseResult.data);
        res.status(verification.valid ? 200 : 422).json({
            status: verification.valid ? 'success' : 'error',
            data: verification,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Validation failed' });
    }
};
exports.postValidatePromoCode = postValidatePromoCode;
