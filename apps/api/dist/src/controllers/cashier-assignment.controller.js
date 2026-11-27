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
exports.postRevoke = exports.putAssignment = exports.postAssignment = exports.getContext = exports.getAssignments = void 0;
const zod_1 = require("zod");
const assignmentService = __importStar(require("../services/cashier-assignment.service"));
const cashier_assignment_validator_1 = require("../validators/cashier-assignment.validator");
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
const getAssignments = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = cashier_assignment_validator_1.listCashierAssignmentsQuerySchema.parse(req.query);
        const records = await assignmentService.fetchAssignments(actor, query);
        res.status(200).json({ status: 'success', data: records });
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
        const message = error instanceof Error ? error.message : 'Failed to fetch cashier assignments';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getAssignments = getAssignments;
const getContext = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const query = cashier_assignment_validator_1.assignmentContextQuerySchema.parse(req.query);
        const context = await assignmentService.fetchAssignmentContext(actor, query);
        res.status(200).json({ status: 'success', data: context });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to retrieve assignment context';
        res.status(400).json({ status: 'error', message });
    }
};
exports.getContext = getContext;
const postAssignment = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = cashier_assignment_validator_1.createCashierAssignmentSchema.parse(req.body);
        const assignment = await assignmentService.createCustodyAssignment(actor, input);
        res.status(201).json({
            status: 'success',
            data: assignment,
            message: 'Cash drawer custody assigned successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to assign cashier';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postAssignment = postAssignment;
const putAssignment = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const assignmentId = Number(req.params.id);
        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
            return;
        }
        const input = cashier_assignment_validator_1.updateCashierAssignmentSchema.parse(req.body);
        const updated = await assignmentService.modifyCustodyAssignment(actor, assignmentId, input);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Cashier assignment not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: updated,
            message: input.status === 'ACTIVE'
                ? 'Cashier till activated and shift opened.'
                : input.status === 'RELEASED'
                    ? 'Cash drawer custody released.'
                    : 'Cashier assignment updated successfully.',
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
        const message = error instanceof Error ? error.message : 'Failed to update assignment';
        res.status(400).json({ status: 'error', message });
    }
};
exports.putAssignment = putAssignment;
const postRevoke = async (req, res) => {
    try {
        const actor = getActor(req);
        if (!actor) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const assignmentId = Number(req.params.id);
        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
            return;
        }
        const { reason } = cashier_assignment_validator_1.revokeAssignmentSchema.parse(req.body);
        const revoked = await assignmentService.revokeCustodyAssignment(actor, assignmentId, reason);
        if (!revoked) {
            res.status(404).json({ status: 'error', message: 'Cashier assignment not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: revoked,
            message: 'Cash drawer custody revoked and compliance alert dispatched.',
        });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Revocation reason is required',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to revoke custody';
        res.status(400).json({ status: 'error', message });
    }
};
exports.postRevoke = postRevoke;
