// apps/api/src/services/role.service.ts
import * as roleRepo from '../repositories/role.repository';
import type { CreateRoleInput, UpdateRoleInput } from '../validators/role.validator';

export const fetchTenantRolesDirectory = async (tenantId: number) => {
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

export const provisionCustomRole = async (tenantId: number, input: CreateRoleInput) => {
  return await roleRepo.createCustomRoleTransaction(tenantId, input);
};

export const modifyCustomRole = async (
  tenantId: number,
  roleId: number,
  input: UpdateRoleInput
) => {
  if (!Number.isInteger(roleId) || roleId <= 0) {
    throw new Error('Invalid role identifier');
  }
  return await roleRepo.updateCustomRoleTransaction(tenantId, roleId, input);
};

export const removeCustomRole = async (tenantId: number, roleId: number) => {
  if (!Number.isInteger(roleId) || roleId <= 0) {
    throw new Error('Invalid role identifier');
  }
  return await roleRepo.deleteCustomRoleTransaction(tenantId, roleId);
};

export const getEffectiveUserPermissions = roleRepo.resolveEffectivePermissions;
export const getUserAuthorizedBranches = roleRepo.findUserAuthorizedBranchIds;