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
const assignmentRepo = __importStar(require("../repositories/cashier-assignment.repository"));
const cashier_assignment_validator_1 = require("../validators/cashier-assignment.validator");
const getAssignments = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { startDate, endDate, branchId, status, userId } = req.query;
        const branchIdStr = typeof branchId === 'string' ? branchId : undefined;
        const branchIdNum = branchIdStr && branchIdStr !== 'ALL' ? parseInt(branchIdStr, 10) : undefined;
        const userIdNum = typeof userId === 'string' && userId !== 'ALL' ? parseInt(userId, 10) : undefined;
        const records = await assignmentRepo.listCashierAssignments(tenantId, {
            startDate: typeof startDate === 'string' ? startDate : undefined,
            endDate: typeof endDate === 'string' ? endDate : undefined,
            branchId: branchIdNum && !isNaN(branchIdNum) ? branchIdNum : undefined,
            userId: userIdNum && !isNaN(userIdNum) ? userIdNum : undefined,
            status: typeof status === 'string' ? status : undefined,
        });
        res.status(200).json({ status: 'success', data: records });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch cashier assignments' });
    }
};
exports.getAssignments = getAssignments;
const getContext = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { branchId } = req.query;
        const branchIdNum = typeof branchId === 'string' && branchId !== 'ALL' ? parseInt(branchId, 10) : undefined;
        const context = await assignmentRepo.getAssignmentContext(tenantId, branchIdNum);
        res.status(200).json({ status: 'success', data: context });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to retrieve assignment context' });
    }
};
exports.getContext = getContext;
const postAssignment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const supervisorId = req.user?.userId;
        if (!tenantId || !supervisorId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const input = cashier_assignment_validator_1.createCashierAssignmentSchema.parse(req.body);
        const assignment = await assignmentRepo.assignCashier(tenantId, supervisorId, input);
        res.status(201).json({
            status: 'success',
            data: assignment,
            message: 'Cash drawer custody assigned successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to assign cashier' });
    }
};
exports.postAssignment = postAssignment;
const putAssignment = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const assignmentId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(assignmentId)) {
            res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
            return;
        }
        const input = cashier_assignment_validator_1.updateCashierAssignmentSchema.parse(req.body);
        const updated = await assignmentRepo.updateAssignment(tenantId, assignmentId, input);
        res.status(200).json({
            status: 'success',
            data: updated,
            message: 'Cashier assignment updated successfully.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to update assignment' });
    }
};
exports.putAssignment = putAssignment;
const postRevoke = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const assignmentId = parseInt(String(req.params.id), 10);
        if (!tenantId || isNaN(assignmentId)) {
            res.status(400).json({ status: 'error', message: 'Invalid assignment identifier' });
            return;
        }
        const { reason } = cashier_assignment_validator_1.revokeAssignmentSchema.parse(req.body);
        const revoked = await assignmentRepo.revokeAssignment(tenantId, assignmentId, reason);
        res.status(200).json({
            status: 'success',
            data: revoked,
            message: 'Cash drawer custody revoked and terminal access restricted.',
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message || 'Failed to revoke custody' });
    }
};
exports.postRevoke = postRevoke;
