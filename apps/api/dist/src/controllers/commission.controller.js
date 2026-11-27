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
exports.postSettleRun = exports.postApproveRun = exports.postGenerateRun = exports.getRuns = exports.getPreview = exports.putPlan = exports.postPlan = exports.getPlans = void 0;
const zod_1 = require("zod");
const commissionService = __importStar(require("../services/commission.service"));
const commission_validator_1 = require("../validators/commission.validator");
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
function parseOptionalBranchId(raw) {
    if (typeof raw !== 'string' || raw === '' || raw === 'ALL')
        return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
const getPlans = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = parseOptionalBranchId(req.query.branchId);
        const plans = await commissionService.fetchPlans(actor, branchId);
        res.status(200).json({ status: 'success', data: plans });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch commission plans';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getPlans = getPlans;
const postPlan = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = commission_validator_1.createCommissionPlanSchema.parse(req.body);
        const plan = await commissionService.provisionPlan(actor, input);
        res.status(201).json({
            status: 'success',
            data: plan,
            message: `Commission plan "${plan.name}" created.`,
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
        const message = error instanceof Error ? error.message : 'Failed to create commission plan';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postPlan = postPlan;
const putPlan = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const planId = Number(req.params.id);
        if (!Number.isInteger(planId) || planId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid plan identifier' });
            return;
        }
        const input = commission_validator_1.updateCommissionPlanSchema.parse(req.body);
        const updated = await commissionService.modifyPlan(actor, planId, input);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Commission plan not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Commission plan updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update commission plan';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putPlan = putPlan;
const getPreview = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = commission_validator_1.previewCommissionQuerySchema.parse(req.query);
        const preview = await commissionService.previewCommissions(actor, query);
        res.status(200).json({ status: 'success', data: preview });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid preview parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to calculate commissions';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getPreview = getPreview;
const getRuns = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = parseOptionalBranchId(req.query.branchId);
        const runs = await commissionService.fetchPayoutRuns(actor, branchId);
        res.status(200).json({ status: 'success', data: runs });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch payout runs';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getRuns = getRuns;
const postGenerateRun = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = commission_validator_1.generatePayoutRunSchema.parse(req.body);
        const run = await commissionService.generateRun(actor, input);
        res.status(201).json({
            status: 'success',
            data: run,
            message: `Commission run ${run.runNumber} generated as Draft.`,
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
        const message = error instanceof Error ? error.message : 'Failed to generate commission run';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postGenerateRun = postGenerateRun;
const postApproveRun = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const runId = Number(req.params.id);
        if (!Number.isInteger(runId) || runId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid payout run identifier' });
            return;
        }
        const approved = await commissionService.approveRun(actor, runId);
        if (!approved) {
            res.status(404).json({ status: 'error', message: 'Commission payout run not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: approved,
            message: `Commission run ${approved.runNumber} approved for disbursement.`,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to approve commission run';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postApproveRun = postApproveRun;
const postSettleRun = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const runId = Number(req.params.id);
        if (!Number.isInteger(runId) || runId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid payout run identifier' });
            return;
        }
        const input = commission_validator_1.settlePayoutRunSchema.parse(req.body);
        const settled = await commissionService.settleRun(actor, runId, input);
        if (!settled) {
            res.status(404).json({ status: 'error', message: 'Commission payout run not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: settled,
            message: `Commission run ${settled.runNumber} settled and associates notified.`,
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
        const message = error instanceof Error ? error.message : 'Failed to settle commission run';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postSettleRun = postSettleRun;
