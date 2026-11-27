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
exports.settleRun = exports.approveRun = exports.generateRun = exports.fetchPayoutRuns = exports.previewCommissions = exports.modifyPlan = exports.provisionPlan = exports.fetchPlans = void 0;
// apps/api/src/services/commission.service.ts
const commissionRepo = __importStar(require("../repositories/commission.repository"));
const role_service_1 = require("./role.service");
async function resolveBranchScope(actor, requestedBranchId) {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const authorizedIds = authorized === 'ALL' ? null : authorized;
    if (requestedBranchId !== undefined && requestedBranchId !== null) {
        if (authorizedIds !== null && !authorizedIds.includes(requestedBranchId)) {
            throw new Error('You do not have commission clearance for the selected branch.');
        }
        return [requestedBranchId];
    }
    return authorizedIds;
}
const fetchPlans = async (actor, branchId) => {
    const effectiveBranchIds = await resolveBranchScope(actor, branchId);
    return await commissionRepo.listCommissionPlans(actor.tenantId, effectiveBranchIds);
};
exports.fetchPlans = fetchPlans;
const provisionPlan = async (actor, input) => {
    if (input.branchId) {
        await resolveBranchScope(actor, input.branchId);
    }
    return await commissionRepo.createCommissionPlanTransaction(actor.tenantId, input, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.provisionPlan = provisionPlan;
const modifyPlan = async (actor, planId, input) => {
    if (input.branchId) {
        await resolveBranchScope(actor, input.branchId);
    }
    return await commissionRepo.updateCommissionPlanTransaction(actor.tenantId, planId, input, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.modifyPlan = modifyPlan;
const previewCommissions = async (actor, query) => {
    const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
    return await commissionRepo.computeLiveCommissions(actor.tenantId, query.periodStart, query.periodEnd, effectiveBranchIds);
};
exports.previewCommissions = previewCommissions;
const fetchPayoutRuns = async (actor, branchId) => {
    const effectiveBranchIds = await resolveBranchScope(actor, branchId);
    return await commissionRepo.listPayoutRuns(actor.tenantId, effectiveBranchIds);
};
exports.fetchPayoutRuns = fetchPayoutRuns;
const generateRun = async (actor, input) => {
    const effectiveBranchIds = await resolveBranchScope(actor, input.branchId);
    return await commissionRepo.generatePayoutRunTransaction(actor.tenantId, input.periodStart, input.periodEnd, input.branchId ?? null, effectiveBranchIds, input.notes ?? null, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.generateRun = generateRun;
const approveRun = async (actor, runId) => {
    return await commissionRepo.approvePayoutRunTransaction(actor.tenantId, runId, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.approveRun = approveRun;
const settleRun = async (actor, runId, input) => {
    return await commissionRepo.settlePayoutRunTransaction(actor.tenantId, runId, input, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.settleRun = settleRun;
