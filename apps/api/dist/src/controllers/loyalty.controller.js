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
exports.postRewardCatalogItem = exports.postLoyaltyTier = exports.postAdjustPoints = exports.getLoyaltyMembers = exports.getLoyaltyOverview = void 0;
const loyaltyRepo = __importStar(require("../repositories/loyalty.repository"));
const loyalty_validator_1 = require("../validators/loyalty.validator");
const getLoyaltyOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await loyaltyRepo.getLoyaltyDashboardMetrics(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch loyalty analytics' });
    }
};
exports.getLoyaltyOverview = getLoyaltyOverview;
const getLoyaltyMembers = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_validator_1.listLoyaltyQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await loyaltyRepo.listLoyaltyMembers(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.members,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list loyalty members' });
    }
};
exports.getLoyaltyMembers = getLoyaltyMembers;
const postAdjustPoints = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_validator_1.adjustLoyaltyPointsSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await loyaltyRepo.adjustCustomerPoints(tenantId, userId, parseResult.data);
        const sign = parseResult.data.action === 'CREDIT' ? '+' : '-';
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Adjusted loyalty ledger (${sign}${parseResult.data.points} pts) for Reason: ${parseResult.data.reasonCode}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to adjust customer points' });
    }
};
exports.postAdjustPoints = postAdjustPoints;
const postLoyaltyTier = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_validator_1.createLoyaltyTierSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid tier parameters' });
            return;
        }
        const tier = await loyaltyRepo.createTierRecord(tenantId, parseResult.data);
        res.status(201).json({ status: 'success', data: tier, message: `Tier "${tier.name}" created.` });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create tier' });
    }
};
exports.postLoyaltyTier = postLoyaltyTier;
const postRewardCatalogItem = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_validator_1.createRewardCatalogItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ status: 'error', message: 'Invalid reward parameters' });
            return;
        }
        const reward = await loyaltyRepo.createRewardRecord(tenantId, parseResult.data);
        res.status(201).json({ status: 'success', data: reward, message: `Reward "${reward.name}" added to catalog.` });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create reward' });
    }
};
exports.postRewardCatalogItem = postRewardCatalogItem;
