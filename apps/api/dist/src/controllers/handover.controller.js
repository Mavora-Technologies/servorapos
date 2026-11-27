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
exports.postResolveDispute = exports.postDispute = exports.postAcknowledge = exports.putHandover = exports.postHandover = exports.getHandoverDetail = exports.getHandoverContext = exports.getHandovers = void 0;
const zod_1 = require("zod");
const handoverService = __importStar(require("../services/handover.service"));
const handover_validator_1 = require("../validators/handover.validator");
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
const getHandovers = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = handover_validator_1.listHandoversQuerySchema.parse(req.query);
        const entries = await handoverService.fetchHandoverLogs(actor, query);
        res.status(200).json({ status: 'success', data: entries });
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
        const message = error instanceof Error ? error.message : 'Failed to retrieve handover logs';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getHandovers = getHandovers;
const getHandoverContext = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = handover_validator_1.handoverContextQuerySchema.parse(req.query);
        const snapshot = await handoverService.fetchBranchContextSnapshot(actor, query);
        res.status(200).json({ status: 'success', data: snapshot });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid context parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to load branch handover telemetry';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getHandoverContext = getHandoverContext;
const getHandoverDetail = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const handoverId = Number(req.params.id);
        if (!Number.isInteger(handoverId) || handoverId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const entry = await handoverService.fetchHandoverById(actor, handoverId);
        if (!entry) {
            res.status(404).json({ status: 'error', message: 'Handover report not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: entry });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch handover detail';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getHandoverDetail = getHandoverDetail;
const postHandover = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = handover_validator_1.createHandoverSchema.parse(req.body);
        const handover = await handoverService.submitHandover(actor, input);
        res.status(201).json({
            status: 'success',
            data: handover,
            message: 'Manager shift handover successfully submitted.',
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
        const message = error instanceof Error ? error.message : 'Failed to submit handover';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postHandover = postHandover;
const putHandover = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const handoverId = Number(req.params.id);
        if (!Number.isInteger(handoverId) || handoverId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const input = handover_validator_1.updateHandoverSchema.parse(req.body);
        const updated = await handoverService.modifyHandover(actor, handoverId, input);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Handover report not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Shift handover report updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update handover';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putHandover = putHandover;
const postAcknowledge = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const handoverId = Number(req.params.id);
        if (!Number.isInteger(handoverId) || handoverId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const input = handover_validator_1.acknowledgeHandoverSchema.parse(req.body || {});
        const acknowledged = await handoverService.countersignHandover(actor, handoverId, input.notes);
        if (!acknowledged) {
            res.status(404).json({ status: 'error', message: 'Handover report not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: acknowledged,
            message: 'Shift handover officially acknowledged and digitally countersigned.',
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to acknowledge handover';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postAcknowledge = postAcknowledge;
const postDispute = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const handoverId = Number(req.params.id);
        if (!Number.isInteger(handoverId) || handoverId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const { reason } = handover_validator_1.disputeHandoverSchema.parse(req.body);
        const disputed = await handoverService.escalateHandoverDispute(actor, handoverId, reason);
        if (!disputed) {
            res.status(404).json({ status: 'error', message: 'Handover report not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: disputed,
            message: 'Shift handover disputed and escalated to compliance governance.',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Dispute justification is required',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to dispute handover';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postDispute = postDispute;
const postResolveDispute = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const handoverId = Number(req.params.id);
        if (!Number.isInteger(handoverId) || handoverId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid handover identifier' });
            return;
        }
        const { resolutionNotes, postGlAdjustment } = handover_validator_1.resolveDisputeSchema.parse(req.body);
        const resolved = await handoverService.resolveHandoverDispute(actor, handoverId, resolutionNotes, postGlAdjustment);
        if (!resolved) {
            res.status(404).json({ status: 'error', message: 'Handover report not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: resolved,
            message: 'Handover dispute officially resolved and closed.',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Resolution notes required',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to resolve dispute';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postResolveDispute = postResolveDispute;
