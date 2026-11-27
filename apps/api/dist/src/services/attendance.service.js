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
exports.rejectTimesheets = exports.approveTimesheets = exports.recordManualAdjustment = exports.recordClockOut = exports.recordClockIn = exports.fetchLiveDutyRoster = exports.fetchAttendanceLedger = void 0;
// apps/api/src/services/attendance.service.ts
const attendanceRepo = __importStar(require("../repositories/attendance.repository"));
const role_service_1 = require("./role.service");
async function resolveBranchScope(actor, requestedBranchId) {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    const authorizedIds = authorized === 'ALL' ? null : authorized;
    if (requestedBranchId !== undefined) {
        if (authorizedIds !== null && !authorizedIds.includes(requestedBranchId)) {
            throw new Error('You do not have attendance clearance for the selected branch.');
        }
        return [requestedBranchId];
    }
    return authorizedIds;
}
const fetchAttendanceLedger = async (actor, query) => {
    const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
    return await attendanceRepo.listAttendanceRecords(actor.tenantId, {
        startDate: query.startDate,
        endDate: query.endDate,
        effectiveBranchIds,
        userId: query.userId,
        status: query.status,
    });
};
exports.fetchAttendanceLedger = fetchAttendanceLedger;
const fetchLiveDutyRoster = async (actor, query) => {
    const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
    return await attendanceRepo.getLiveDutyRoster(actor.tenantId, effectiveBranchIds);
};
exports.fetchLiveDutyRoster = fetchLiveDutyRoster;
const recordClockIn = async (actor, input) => {
    await resolveBranchScope(actor, input.branchId);
    return await attendanceRepo.clockInTransaction(actor.tenantId, input, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.recordClockIn = recordClockIn;
const recordClockOut = async (actor, input) => {
    const session = await attendanceRepo.findActiveSessionById(actor.tenantId, input.attendanceId);
    if (!session) {
        throw new Error('Active shift session not found.');
    }
    await resolveBranchScope(actor, session.branchId);
    return await attendanceRepo.clockOutTransaction(actor.tenantId, input, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.recordClockOut = recordClockOut;
const recordManualAdjustment = async (actor, input) => {
    await resolveBranchScope(actor, input.branchId);
    return await attendanceRepo.createManualAdjustmentTransaction(actor.tenantId, input, {
        userId: actor.userId,
        role: actor.role,
        ipAddress: actor.ipAddress,
    });
};
exports.recordManualAdjustment = recordManualAdjustment;
const approveTimesheets = async (actor, recordIds) => {
    const effectiveBranchIds = await resolveBranchScope(actor);
    const res = await attendanceRepo.batchReviewAttendanceTransaction(actor.tenantId, recordIds, effectiveBranchIds, 'APPROVED', { userId: actor.userId, role: actor.role, ipAddress: actor.ipAddress });
    return { approvedCount: res.count };
};
exports.approveTimesheets = approveTimesheets;
const rejectTimesheets = async (actor, recordIds, reason) => {
    const effectiveBranchIds = await resolveBranchScope(actor);
    const res = await attendanceRepo.batchReviewAttendanceTransaction(actor.tenantId, recordIds, effectiveBranchIds, 'REJECTED', { userId: actor.userId, role: actor.role, ipAddress: actor.ipAddress }, reason);
    return { rejectedCount: res.count };
};
exports.rejectTimesheets = rejectTimesheets;
