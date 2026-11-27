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
exports.acknowledgeAppraisal = exports.modifyAppraisal = exports.submitAppraisal = exports.removeDraftAppraisal = exports.fetchLiveTelemetry = exports.fetchPerformanceReviews = void 0;
// apps/api/src/services/performance.service.ts
const perfRepo = __importStar(require("../repositories/performance.repository"));
const role_service_1 = require("./role.service");
async function resolveBranchScope(actor, requestedBranchId) {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
    if (requestedBranchId !== undefined) {
        if (authorizedBranchIds !== null && !authorizedBranchIds.includes(requestedBranchId)) {
            throw new Error('You do not have performance clearance for the selected branch.');
        }
        return { authorizedBranchIds, effectiveBranchIds: [requestedBranchId] };
    }
    return { authorizedBranchIds, effectiveBranchIds: authorizedBranchIds };
}
const fetchPerformanceReviews = async (actor, query) => {
    const { effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
    return await perfRepo.listPerformanceReviews(actor.tenantId, {
        cycle: query.cycle,
        role: query.role,
        userId: query.userId,
        effectiveBranchIds,
        status: query.status,
        minRating: query.minRating,
        startDate: query.startDate,
        endDate: query.endDate,
    });
};
exports.fetchPerformanceReviews = fetchPerformanceReviews;
const fetchLiveTelemetry = async (actor, query) => {
    const { authorizedBranchIds, effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
    return await perfRepo.getLiveStaffTelemetry(actor.tenantId, {
        authorizedBranchIds,
        effectiveBranchIds,
        role: query.role,
        startDate: query.startDate,
        endDate: query.endDate,
    });
};
exports.fetchLiveTelemetry = fetchLiveTelemetry;
const removeDraftAppraisal = async (actor, reviewId) => {
    const existing = await perfRepo.findReviewById(actor.tenantId, reviewId);
    if (!existing)
        return null;
    if (existing.employeeDefaultBranchId) {
        await resolveBranchScope(actor, existing.employeeDefaultBranchId);
    }
    return await perfRepo.deleteDraftReviewTransaction(actor.tenantId, reviewId, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.removeDraftAppraisal = removeDraftAppraisal;
const submitAppraisal = async (actor, input) => {
    if (input.userId === actor.userId &&
        actor.role !== 'ADMIN' &&
        actor.role !== 'SUPER_ADMIN') {
        throw new Error('Governance control: Managers cannot submit formal appraisals on themselves.');
    }
    return await perfRepo.createReviewTransaction(actor.tenantId, actor.userId, input, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.submitAppraisal = submitAppraisal;
const modifyAppraisal = async (actor, reviewId, input) => {
    const existing = await perfRepo.findReviewById(actor.tenantId, reviewId);
    if (!existing)
        return null;
    if (existing.employeeDefaultBranchId) {
        await resolveBranchScope(actor, existing.employeeDefaultBranchId);
    }
    return await perfRepo.updateReviewTransaction(actor.tenantId, reviewId, input, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.modifyAppraisal = modifyAppraisal;
const acknowledgeAppraisal = async (actor, reviewId, employeeFeedback) => {
    return await perfRepo.acknowledgeReviewTransaction(actor.tenantId, reviewId, actor.userId, employeeFeedback, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.acknowledgeAppraisal = acknowledgeAppraisal;
