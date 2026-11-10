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
exports.postAcknowledge = exports.putReview = exports.postReview = exports.getTelemetry = exports.getReviews = void 0;
const perfRepo = __importStar(require("../repositories/performance.repository"));
const performance_validator_1 = require("../validators/performance.validator");
const getReviews = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { cycle, userId, status, startDate, endDate } = req.query;
        const userIdNum = typeof userId === 'string' && userId !== 'ALL' ? parseInt(userId, 10) : undefined;
        const reviews = await perfRepo.listPerformanceReviews(tenantId, {
            cycle: typeof cycle === 'string' ? cycle : undefined,
            userId: userIdNum && !isNaN(userIdNum) ? userIdNum : undefined,
            status: typeof status === 'string' ? status : undefined,
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
        });
        res.status(200).json({ status: 'success', data: reviews });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch performance reviews' });
    }
};
exports.getReviews = getReviews;
const getTelemetry = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const telemetry = await perfRepo.getLiveStaffTelemetry(tenantId);
        res.status(200).json({ status: 'success', data: telemetry });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch live telemetry' });
    }
};
exports.getTelemetry = getTelemetry;
const postReview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const reviewerId = req.user?.userId;
        if (!tenantId || !reviewerId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = performance_validator_1.createReviewSchema.parse(req.body);
        const review = await perfRepo.createReview(tenantId, reviewerId, input);
        res.status(201).json({
            status: 'success',
            data: review,
            message: 'Staff performance appraisal successfully submitted.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            const detailedMessage = error.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            res.status(400).json({
                status: 'error',
                message: detailedMessage,
                errors: error.errors,
            });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to create review' });
    }
};
exports.postReview = postReview;
const putReview = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const reviewId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(reviewId)) {
            res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
            return;
        }
        const input = performance_validator_1.updateReviewSchema.parse(req.body);
        const updated = await perfRepo.updateReview(tenantId, reviewId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Performance review updated successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update review' });
    }
};
exports.putReview = putReview;
const postAcknowledge = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;
        const reviewId = parseInt(String(req.params.id), 10);
        if (!tenantId || !userId || isNaN(reviewId)) {
            res.status(400).json({ status: 'error', message: 'Invalid request or session' });
            return;
        }
        const { employeeFeedback } = performance_validator_1.acknowledgeReviewSchema.parse(req.body);
        const acknowledged = await perfRepo.acknowledgeReview(tenantId, reviewId, userId, employeeFeedback);
        res.status(200).json({
            status: 'success',
            data: acknowledged,
            message: 'Appraisal acknowledged and archived to employee file.',
        });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to acknowledge review' });
    }
};
exports.postAcknowledge = postAcknowledge;
