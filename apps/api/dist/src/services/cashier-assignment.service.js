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
exports.revokeCustodyAssignment = exports.modifyCustodyAssignment = exports.createCustodyAssignment = exports.fetchAssignmentContext = exports.fetchAssignments = void 0;
// apps/api/src/services/cashier-assignment.service.ts
const assignmentRepo = __importStar(require("../repositories/cashier-assignment.repository"));
const role_service_1 = require("./role.service");
async function resolveBranchScope(actor, requestedBranchId) {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
    if (requestedBranchId !== undefined) {
        if (authorizedBranchIds !== null && !authorizedBranchIds.includes(requestedBranchId)) {
            throw new Error('You do not have custody management clearance for the selected branch.');
        }
        return { authorizedBranchIds, effectiveBranchIds: [requestedBranchId] };
    }
    return { authorizedBranchIds, effectiveBranchIds: authorizedBranchIds };
}
const fetchAssignments = async (actor, query) => {
    const { effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
    return await assignmentRepo.listCashierAssignments(actor.tenantId, {
        startDate: query.startDate,
        endDate: query.endDate,
        effectiveBranchIds,
        status: query.status,
        userId: query.userId,
    });
};
exports.fetchAssignments = fetchAssignments;
const fetchAssignmentContext = async (actor, query) => {
    const { authorizedBranchIds, effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
    return await assignmentRepo.getAssignmentContext(actor.tenantId, authorizedBranchIds, effectiveBranchIds);
};
exports.fetchAssignmentContext = fetchAssignmentContext;
const createCustodyAssignment = async (actor, input) => {
    await resolveBranchScope(actor, input.branchId);
    return await assignmentRepo.assignCashierTransaction(actor.tenantId, actor.userId, input, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.createCustodyAssignment = createCustodyAssignment;
const modifyCustodyAssignment = async (actor, assignmentId, input) => {
    const existing = await assignmentRepo.findAssignmentById(actor.tenantId, assignmentId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await assignmentRepo.updateAssignmentTransaction(actor.tenantId, assignmentId, input, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.modifyCustodyAssignment = modifyCustodyAssignment;
const revokeCustodyAssignment = async (actor, assignmentId, reason) => {
    const existing = await assignmentRepo.findAssignmentById(actor.tenantId, assignmentId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await assignmentRepo.revokeAssignmentTransaction(actor.tenantId, assignmentId, reason, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.revokeCustodyAssignment = revokeCustodyAssignment;
