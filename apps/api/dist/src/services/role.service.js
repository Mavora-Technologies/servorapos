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
exports.getUserAuthorizedBranches = exports.getEffectiveUserPermissions = exports.removeCustomRole = exports.modifyCustomRole = exports.provisionCustomRole = exports.fetchTenantRolesDirectory = void 0;
// apps/api/src/services/role.service.ts
const roleRepo = __importStar(require("../repositories/role.repository"));
const fetchTenantRolesDirectory = async (tenantId) => {
    const data = await roleRepo.listRolesWithMetrics(tenantId);
    return {
        metrics: {
            totalRoles: data.roles.length,
            systemRoles: data.roles.filter((r) => r.isSystemRole).length,
            customRoles: data.roles.filter((r) => !r.isSystemRole).length,
            totalPermissions: data.availablePermissions.length,
        },
        roles: data.roles,
        availablePermissions: data.availablePermissions,
    };
};
exports.fetchTenantRolesDirectory = fetchTenantRolesDirectory;
const provisionCustomRole = async (tenantId, input) => {
    return await roleRepo.createCustomRoleTransaction(tenantId, input);
};
exports.provisionCustomRole = provisionCustomRole;
const modifyCustomRole = async (tenantId, roleId, input) => {
    if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new Error('Invalid role identifier');
    }
    return await roleRepo.updateCustomRoleTransaction(tenantId, roleId, input);
};
exports.modifyCustomRole = modifyCustomRole;
const removeCustomRole = async (tenantId, roleId) => {
    if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new Error('Invalid role identifier');
    }
    return await roleRepo.deleteCustomRoleTransaction(tenantId, roleId);
};
exports.removeCustomRole = removeCustomRole;
exports.getEffectiveUserPermissions = roleRepo.resolveEffectivePermissions;
exports.getUserAuthorizedBranches = roleRepo.findUserAuthorizedBranchIds;
