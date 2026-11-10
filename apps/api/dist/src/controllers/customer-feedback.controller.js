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
exports.patchFeedbackStatus = exports.postFeedback = exports.getFeedbacks = exports.getFeedbackOverview = void 0;
const feedbackRepo = __importStar(require("../repositories/customer-feedback.repository"));
const customer_feedback_validator_1 = require("../validators/customer-feedback.validator");
const getFeedbackOverview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const data = await feedbackRepo.getFeedbackDashboardMetrics(tenantId, branchId);
        res.status(200).json({ status: 'success', data });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to aggregate feedback metrics' });
    }
};
exports.getFeedbackOverview = getFeedbackOverview;
const getFeedbacks = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = customer_feedback_validator_1.listFeedbackQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const result = await feedbackRepo.listCustomerFeedbacks(tenantId, parseResult.data);
        res.status(200).json({
            status: 'success',
            data: result.feedback,
            pagination: result.pagination,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to list feedback records' });
    }
};
exports.getFeedbacks = getFeedbacks;
const postFeedback = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const parseResult = customer_feedback_validator_1.createFeedbackSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const created = await feedbackRepo.createFeedbackRecord(tenantId, parseResult.data);
        res.status(201).json({
            status: 'success',
            data: created,
            message: 'Customer feedback logged successfully.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to record feedback' });
    }
};
exports.postFeedback = postFeedback;
const patchFeedbackStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const feedbackId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(feedbackId)) {
            res.status(400).json({ status: 'error', message: 'Valid feedback ID required' });
            return;
        }
        const parseResult = customer_feedback_validator_1.updateFeedbackStatusSchema.safeParse(req.body);
        if (!parseResult.success) {
            const issues = parseResult.error.issues || [];
            const detailed = issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
            res.status(400).json({ status: 'error', message: detailed, errors: issues });
            return;
        }
        const updated = await feedbackRepo.updateFeedbackStatus(tenantId, feedbackId, parseResult.data);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Feedback entry not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: `Feedback status transitioned to ${updated.status}.`,
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update feedback status' });
    }
};
exports.patchFeedbackStatus = patchFeedbackStatus;
