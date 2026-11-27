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
exports.deleteReview = exports.postAcknowledge = exports.putReview = exports.postReview = exports.getTelemetry = exports.getReviews = void 0;
const zod_1 = require("zod");
const perfService = __importStar(require("../services/performance.service"));
const performance_validator_1 = require("../validators/performance.validator");
function getActor(req) {
    const user = req.user;
    if (!user?.tenantId || !user?.userId)
        return null;
    return {
        tenantId: user.tenantId,
        userId: user.userId,
        role: user.role,
        ipAddress: req.ip || null,
    };
}
const getReviews = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = performance_validator_1.listReviewsQuerySchema.parse(req.query);
        const reviews = await perfService.fetchPerformanceReviews(actor, query);
        res.status(200).json({ status: 'success', data: reviews });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid filter parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to fetch performance reviews';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getReviews = getReviews;
const getTelemetry = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = performance_validator_1.telemetryQuerySchema.parse(req.query);
        const payload = await perfService.fetchLiveTelemetry(actor, query);
        res.status(200).json({ status: 'success', data: payload });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid telemetry parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to fetch live telemetry';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getTelemetry = getTelemetry;
const postReview = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = performance_validator_1.createReviewSchema.parse(req.body);
        const review = await perfService.submitAppraisal(actor, input);
        res.status(201).json({
            status: 'success',
            data: review,
            message: 'Staff performance appraisal submitted successfully.',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to create review';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postReview = postReview;
const putReview = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const reviewId = Number(req.params.id);
        if (!Number.isInteger(reviewId) || reviewId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
            return;
        }
        const input = performance_validator_1.updateReviewSchema.parse(req.body);
        const updated = await perfService.modifyAppraisal(actor, reviewId, input);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Performance appraisal not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: input.status === 'FINALIZED'
                ? 'Appraisal finalized and locked to employee file.'
                : 'Performance review updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update review';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putReview = putReview;
const postAcknowledge = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const reviewId = Number(req.params.id);
        if (!Number.isInteger(reviewId) || reviewId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
            return;
        }
        const { employeeFeedback } = performance_validator_1.acknowledgeReviewSchema.parse(req.body || {});
        const acknowledged = await perfService.acknowledgeAppraisal(actor, reviewId, employeeFeedback);
        if (!acknowledged) {
            res.status(404).json({ status: 'error', message: 'Review record not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: acknowledged,
            message: 'Appraisal acknowledged and archived to employee file.',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to acknowledge review';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postAcknowledge = postAcknowledge;
const deleteReview = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const reviewId = Number(req.params.id);
        if (!Number.isInteger(reviewId) || reviewId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid review identifier' });
            return;
        }
        const deleted = await perfService.removeDraftAppraisal(actor, reviewId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Appraisal draft not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: 'Draft appraisal deleted successfully.',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete draft appraisal';
        res.status(400).json({ status: 'error', message });
    }
};
exports.deleteReview = deleteReview;
