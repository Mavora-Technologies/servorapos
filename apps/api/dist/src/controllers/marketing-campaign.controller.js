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
exports.getTemplates = exports.postDispatchCampaign = exports.patchCampaign = exports.postCampaign = exports.getCampaigns = exports.getCampaignsOverview = void 0;
const campaignRepo = __importStar(require("../repositories/marketing-campaign.repository"));
const marketing_campaign_validator_1 = require("../validators/marketing-campaign.validator");
const getCampaignsOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const data = await campaignRepo.getCampaignsOverviewMetrics(tenantId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate campaign metrics' });
    }
};
exports.getCampaignsOverview = getCampaignsOverview;
const getCampaigns = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = marketing_campaign_validator_1.listCampaignsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await campaignRepo.listTenantCampaigns(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.campaigns,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list marketing campaigns' });
    }
};
exports.getCampaigns = getCampaigns;
const postCampaign = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        if (!tenantId || !userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = marketing_campaign_validator_1.createMarketingCampaignSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await campaignRepo.createMarketingCampaign(tenantId, userId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: `Campaign "${created.name}" created successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create campaign' });
    }
};
exports.postCampaign = postCampaign;
const patchCampaign = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const campaignId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(campaignId)) {
            res.status(400).json({ status: 'error', message: 'Valid campaign ID required' });
            return;
        }
        const parseResult = marketing_campaign_validator_1.updateMarketingCampaignSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await campaignRepo.updateMarketingCampaign(tenantId, campaignId, parseResult.data);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Campaign not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Campaign "${updated.name}" updated successfully.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update campaign' });
    }
};
exports.patchCampaign = patchCampaign;
const postDispatchCampaign = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const campaignId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(campaignId)) {
            res.status(400).json({ status: 'error', message: 'Valid campaign ID required' });
            return;
        }
        const dispatched = await campaignRepo.dispatchCampaignRun(tenantId, campaignId);
        res.status(200).json({
            status: 'success',
            data: dispatched,
            message: `Campaign broadcast dispatched to ${dispatched.recipientsCount} recipients.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to dispatch broadcast' });
    }
};
exports.postDispatchCampaign = postDispatchCampaign;
const getTemplates = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const templates = await campaignRepo.listMarketingTemplates(tenantId);
        res.status(200).json({ status: 'success', data: templates });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list templates' });
    }
};
exports.getTemplates = getTemplates;
