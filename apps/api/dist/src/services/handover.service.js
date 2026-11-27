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
exports.resolveHandoverDispute = exports.escalateHandoverDispute = exports.countersignHandover = exports.modifyHandover = exports.submitHandover = exports.fetchBranchContextSnapshot = exports.fetchHandoverById = exports.fetchHandoverLogs = void 0;
// apps/api/src/services/handover.service.ts
const handoverRepo = __importStar(require("../repositories/handover.repository"));
const role_service_1 = require("./role.service");
async function resolveBranchScope(actor, requestedBranchId) {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const authorizedIds = authorized === 'ALL' ? null : authorized;
    if (requestedBranchId !== undefined) {
        if (authorizedIds !== null && !authorizedIds.includes(requestedBranchId)) {
            throw new Error('You do not have handover clearance for the selected branch.');
        }
        return [requestedBranchId];
    }
    return authorizedIds;
}
const fetchHandoverLogs = async (actor, query) => {
    const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
    return await handoverRepo.listHandovers(actor.tenantId, {
        startDate: query.startDate,
        endDate: query.endDate,
        effectiveBranchIds,
        shiftType: query.shiftType,
        status: query.status,
    });
};
exports.fetchHandoverLogs = fetchHandoverLogs;
const fetchHandoverById = async (actor, handoverId) => {
    const record = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
    if (!record)
        return null;
    await resolveBranchScope(actor, record.branchId);
    return record;
};
exports.fetchHandoverById = fetchHandoverById;
const fetchBranchContextSnapshot = async (actor, query) => {
    await resolveBranchScope(actor, query.branchId);
    return await handoverRepo.getBranchHandoverContext(actor.tenantId, query.branchId, query.date);
};
exports.fetchBranchContextSnapshot = fetchBranchContextSnapshot;
const submitHandover = async (actor, input) => {
    await resolveBranchScope(actor, input.branchId);
    return await handoverRepo.createHandoverTransaction(actor.tenantId, actor.userId, input, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.submitHandover = submitHandover;
const modifyHandover = async (actor, handoverId, input) => {
    const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await handoverRepo.updateHandoverTransaction(actor.tenantId, handoverId, input, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.modifyHandover = modifyHandover;
const countersignHandover = async (actor, handoverId, notes) => {
    const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await handoverRepo.acknowledgeHandoverTransaction(actor.tenantId, handoverId, actor.userId, notes, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.countersignHandover = countersignHandover;
const escalateHandoverDispute = async (actor, handoverId, reason) => {
    const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await handoverRepo.disputeHandoverTransaction(actor.tenantId, handoverId, actor.userId, reason, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.escalateHandoverDispute = escalateHandoverDispute;
const resolveHandoverDispute = async (actor, handoverId, resolutionNotes, postGlAdjustment) => {
    const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await handoverRepo.resolveDisputedHandoverTransaction(actor.tenantId, handoverId, resolutionNotes, postGlAdjustment, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.resolveHandoverDispute = resolveHandoverDispute;
