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
exports.provisionShiftTemplate = exports.replicateWeeklyRoster = exports.publishWeeklyRoster = exports.removeShift = exports.modifyShift = exports.allocateShift = exports.fetchWeeklyRoster = void 0;
// apps/api/src/services/schedule.service.ts
const scheduleRepo = __importStar(require("../repositories/schedule.repository"));
const role_service_1 = require("./role.service");
function addSixDays(weekStart) {
    const [y, m, d] = weekStart.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 6));
    return dt.toISOString().split('T')[0];
}
async function resolveBranchScope(actor, requestedBranchId) {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
    if (requestedBranchId) {
        if (authorizedBranchIds !== null && !authorizedBranchIds.includes(requestedBranchId)) {
            throw new Error('You do not have scheduling clearance for the selected branch.');
        }
        return { authorizedBranchIds, effectiveBranchIds: [requestedBranchId] };
    }
    return { authorizedBranchIds, effectiveBranchIds: authorizedBranchIds };
}
const fetchWeeklyRoster = async (actor, query) => {
    const { authorizedBranchIds, effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
    return await scheduleRepo.getWeeklyRoster(actor.tenantId, {
        weekStart: query.weekStart,
        weekEnd: addSixDays(query.weekStart),
        authorizedBranchIds,
        effectiveBranchIds,
        role: query.role,
    });
};
exports.fetchWeeklyRoster = fetchWeeklyRoster;
const allocateShift = async (actor, input) => {
    await resolveBranchScope(actor, input.branchId);
    return await scheduleRepo.createScheduleTransaction(actor.tenantId, input, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.allocateShift = allocateShift;
const modifyShift = async (actor, scheduleId, input) => {
    const existing = await scheduleRepo.findScheduleById(actor.tenantId, scheduleId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    if (input.branchId && input.branchId !== existing.branchId) {
        await resolveBranchScope(actor, input.branchId);
    }
    return await scheduleRepo.updateScheduleTransaction(actor.tenantId, scheduleId, input, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.modifyShift = modifyShift;
const removeShift = async (actor, scheduleId) => {
    const existing = await scheduleRepo.findScheduleById(actor.tenantId, scheduleId);
    if (!existing)
        return null;
    await resolveBranchScope(actor, existing.branchId);
    return await scheduleRepo.deleteScheduleTransaction(actor.tenantId, scheduleId, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.removeShift = removeShift;
const publishWeeklyRoster = async (actor, input) => {
    const { effectiveBranchIds } = await resolveBranchScope(actor, input.branchId);
    return await scheduleRepo.publishWeekTransaction(actor.tenantId, input.weekStart, effectiveBranchIds, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.publishWeeklyRoster = publishWeeklyRoster;
const replicateWeeklyRoster = async (actor, input) => {
    const { effectiveBranchIds } = await resolveBranchScope(actor, input.branchId);
    return await scheduleRepo.copyWeekTransaction(actor.tenantId, input.fromWeekStart, input.toWeekStart, effectiveBranchIds, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.replicateWeeklyRoster = replicateWeeklyRoster;
const provisionShiftTemplate = async (actor, input) => {
    if (input.branchId) {
        await resolveBranchScope(actor, input.branchId);
    }
    return await scheduleRepo.createShiftTemplateTransaction(actor.tenantId, input, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.provisionShiftTemplate = provisionShiftTemplate;
