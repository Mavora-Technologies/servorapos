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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetEmployeePin = exports.setEmployeeStatus = exports.modifyEmployee = exports.provisionEmployee = exports.getStaffRosterDirectory = void 0;
// apps/api/src/services/staff.service.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const staffRepo = __importStar(require("../repositories/staff.repository"));
const role_service_1 = require("./role.service");
const PRIVILEGED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);
function assertRoleEscalationGuard(actorRole, targetRole) {
    if (!targetRole)
        return;
    if (PRIVILEGED_ROLES.has(targetRole) && !PRIVILEGED_ROLES.has(actorRole)) {
        throw new Error('Only an Administrator can assign or modify Administrator-level roles.');
    }
}
const getStaffRosterDirectory = async (actor, filters) => {
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    if (filters.branchId !== undefined &&
        authorized !== 'ALL' &&
        !authorized.includes(filters.branchId)) {
        throw new Error('You do not have clearance to view staff for the selected branch.');
    }
    const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
    const { staff, roles, branches } = await staffRepo.listStaffByTenant(actor.tenantId, filters, authorizedBranchIds);
    const uniqueBranchSet = new Set();
    for (const member of staff) {
        if (member.defaultBranchId)
            uniqueBranchSet.add(member.defaultBranchId);
        for (const m of member.branchMemberships) {
            uniqueBranchSet.add(m.branchId);
        }
    }
    return {
        metrics: {
            totalStaff: staff.length,
            activeStaff: staff.filter((s) => s.isActive).length,
            inactiveStaff: staff.filter((s) => !s.isActive).length,
            onDutyNow: staff.filter((s) => s.isOnDuty).length,
            posPinEnrolled: staff.filter((s) => s.hasPin).length,
            multiBranchStaff: staff.filter((s) => s.branchMemberships.length > 1).length,
            branchCoverage: uniqueBranchSet.size,
        },
        staff,
        roles,
        branches,
    };
};
exports.getStaffRosterDirectory = getStaffRosterDirectory;
const provisionEmployee = async (actor, input) => {
    assertRoleEscalationGuard(actor.role, input.role);
    const roleValid = await staffRepo.verifyTenantRoleSlugExists(actor.tenantId, input.role);
    if (!roleValid) {
        throw new Error(`Role '${input.role}' does not exist in your organization.`);
    }
    const requestedBranchIds = [
        input.defaultBranchId,
        ...input.branchMemberships.map((m) => m.branchId),
    ];
    const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
    if (authorized !== 'ALL') {
        const unauthorizedBranch = requestedBranchIds.find((id) => !authorized.includes(id));
        if (unauthorizedBranch !== undefined) {
            throw new Error('You cannot assign an employee to a branch outside your clearance.');
        }
    }
    const branchesValid = await staffRepo.verifyTenantBranchesExist(actor.tenantId, requestedBranchIds);
    if (!branchesValid) {
        throw new Error('One or more selected branches are invalid or inactive.');
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    const pinHash = input.pin ? await bcryptjs_1.default.hash(input.pin, 10) : null;
    return await staffRepo.createStaffTransaction(actor.tenantId, {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        role: input.role,
        defaultBranchId: input.defaultBranchId,
        passwordHash,
        pinHash,
        branchMemberships: input.branchMemberships,
    }, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.provisionEmployee = provisionEmployee;
const modifyEmployee = async (actor, staffId, input) => {
    const existing = await staffRepo.findStaffById(actor.tenantId, staffId);
    if (!existing) {
        return null;
    }
    assertRoleEscalationGuard(actor.role, existing.role);
    assertRoleEscalationGuard(actor.role, input.role);
    if (input.isActive === false && staffId === actor.userId) {
        throw new Error('You cannot suspend your own active operator account.');
    }
    if (input.role) {
        const roleValid = await staffRepo.verifyTenantRoleSlugExists(actor.tenantId, input.role);
        if (!roleValid) {
            throw new Error(`Role '${input.role}' does not exist in your organization.`);
        }
    }
    const branchIdsToVerify = [];
    if (input.defaultBranchId)
        branchIdsToVerify.push(input.defaultBranchId);
    if (input.branchMemberships) {
        branchIdsToVerify.push(...input.branchMemberships.map((m) => m.branchId));
    }
    if (branchIdsToVerify.length > 0) {
        const authorized = await (0, role_service_1.getUserAuthorizedBranches)(actor.tenantId, actor.userId, actor.role);
        if (authorized !== 'ALL') {
            const unauthorizedBranch = branchIdsToVerify.find((id) => !authorized.includes(id));
            if (unauthorizedBranch !== undefined) {
                throw new Error('You cannot assign an employee to a branch outside your clearance.');
            }
        }
        const branchesValid = await staffRepo.verifyTenantBranchesExist(actor.tenantId, branchIdsToVerify);
        if (!branchesValid) {
            throw new Error('One or more selected branches are invalid or inactive.');
        }
    }
    const passwordHash = input.password ? await bcryptjs_1.default.hash(input.password, 10) : undefined;
    const pinHash = input.pin ? await bcryptjs_1.default.hash(input.pin, 10) : undefined;
    return await staffRepo.updateStaffTransaction(actor.tenantId, staffId, {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        role: input.role,
        defaultBranchId: input.defaultBranchId,
        isActive: input.isActive,
        passwordHash,
        pinHash,
        branchMemberships: input.branchMemberships,
    }, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.modifyEmployee = modifyEmployee;
const setEmployeeStatus = async (actor, staffId, isActive, reason) => {
    if (!isActive && staffId === actor.userId) {
        throw new Error('You cannot suspend your own active operator account.');
    }
    const existing = await staffRepo.findStaffById(actor.tenantId, staffId);
    if (!existing)
        return null;
    assertRoleEscalationGuard(actor.role, existing.role);
    return await staffRepo.updateStaffTransaction(actor.tenantId, staffId, { isActive, reason }, { userId: actor.userId, ipAddress: actor.ipAddress });
};
exports.setEmployeeStatus = setEmployeeStatus;
const resetEmployeePin = async (actor, staffId, pin) => {
    const existing = await staffRepo.findStaffById(actor.tenantId, staffId);
    if (!existing)
        return null;
    assertRoleEscalationGuard(actor.role, existing.role);
    const pinHash = await bcryptjs_1.default.hash(pin, 10);
    return await staffRepo.updateStaffPinTransaction(actor.tenantId, staffId, pinHash, {
        userId: actor.userId,
        ipAddress: actor.ipAddress,
    });
};
exports.resetEmployeePin = resetEmployeePin;
