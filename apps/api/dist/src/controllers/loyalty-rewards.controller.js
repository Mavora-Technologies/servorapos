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
exports.postRedeemReward = exports.patchReward = exports.postReward = exports.getRewardsCatalog = exports.getRewardsOverview = void 0;
const rewardsRepo = __importStar(require("../repositories/loyalty-rewards.repository"));
const loyalty_rewards_validator_1 = require("../validators/loyalty-rewards.validator");
const getRewardsOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await rewardsRepo.getRewardsDashboardMetrics(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch rewards metrics' });
    }
};
exports.getRewardsOverview = getRewardsOverview;
const getRewardsCatalog = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_rewards_validator_1.listRewardsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await rewardsRepo.listCatalogRewards(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.rewards,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list rewards' });
    }
};
exports.getRewardsCatalog = getRewardsCatalog;
const postReward = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_rewards_validator_1.createRewardItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await rewardsRepo.createRewardItem(tenantId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Reward "${created.name}" published to catalog.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create reward' });
    }
};
exports.postReward = postReward;
const patchReward = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rewardId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(rewardId)) {
            res.status(400).json({ status: 'error', message: 'Valid reward ID required' });
            return;
        }
        const parseResult = loyalty_rewards_validator_1.updateRewardItemSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await rewardsRepo.updateRewardItem(tenantId, rewardId, parseResult.data);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Reward item not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Reward "${updated.name}" updated successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update reward' });
    }
};
exports.patchReward = patchReward;
const postRedeemReward = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = loyalty_rewards_validator_1.redeemRewardSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await rewardsRepo.executeRewardRedemption(tenantId, userId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result,
            message: `Redeemed "${result.reward.name}" (-${result.pointsBurned} pts). New balance: ${result.newBalance} pts.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Redemption failed' });
    }
};
exports.postRedeemReward = postRedeemReward;
