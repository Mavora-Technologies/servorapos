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
exports.toggleBranchStatus = exports.updateBranch = exports.createBranch = exports.getBranches = void 0;
const zod_1 = require("zod");
const branchService = __importStar(require("../services/branch.service"));
const branch_validator_1 = require("../validators/branch.validator");
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
const getBranches = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const records = await branchService.listAuthorizedBranches(actor);
        res.status(200).json({ status: 'success', data: records });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch branches';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getBranches = getBranches;
const createBranch = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const payload = branch_validator_1.createBranchSchema.parse(req.body);
        const branch = await branchService.provisionBranch(actor, payload);
        res.status(201).json({
            status: 'success',
            data: branch,
            message: 'Branch location created successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to create branch';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createBranch = createBranch;
const updateBranch = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = Number(req.params.id);
        if (!Number.isInteger(branchId) || branchId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid branch identifier' });
            return;
        }
        const payload = branch_validator_1.updateBranchSchema.parse(req.body);
        const updated = await branchService.modifyBranch(actor, branchId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Branch not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Branch profile updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update branch';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateBranch = updateBranch;
const toggleBranchStatus = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = Number(req.params.id);
        if (!Number.isInteger(branchId) || branchId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid branch identifier' });
            return;
        }
        const updated = await branchService.toggleBranchActiveState(actor, branchId);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Branch not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            message: `Branch ${updated.isActive ? 'activated' : 'deactivated'} successfully.`,
            data: updated,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to toggle branch status';
        res.status(400).json({ status: 'error', message });
    }
};
exports.toggleBranchStatus = toggleBranchStatus;
