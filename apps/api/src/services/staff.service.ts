// apps/api/src/services/staff.service.ts
import bcrypt from 'bcryptjs';
import * as staffRepo from '../repositories/staff.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  CreateStaffInput,
  ListStaffQuery,
  UpdateStaffInput,
} from '../validators/staff.validator';

export interface StaffActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

const PRIVILEGED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function assertRoleEscalationGuard(actorRole: string, targetRole?: string) {
  if (!targetRole) return;
  if (PRIVILEGED_ROLES.has(targetRole) && !PRIVILEGED_ROLES.has(actorRole)) {
    throw new Error('Only an Administrator can assign or modify Administrator-level roles.');
  }
}

export const getStaffRosterDirectory = async (
  actor: StaffActorContext,
  filters: ListStaffQuery
) => {
  const authorized = await getUserAuthorizedBranches(
    actor.tenantId,
    actor.userId,
    actor.role
  );

  if (
    filters.branchId !== undefined &&
    authorized !== 'ALL' &&
    !authorized.includes(filters.branchId)
  ) {
    throw new Error('You do not have clearance to view staff for the selected branch.');
  }

  const authorizedBranchIds = authorized === 'ALL' ? null : authorized;
  const { staff, roles, branches } = await staffRepo.listStaffByTenant(
    actor.tenantId,
    filters,
    authorizedBranchIds
  );

  const uniqueBranchSet = new Set<number>();
  for (const member of staff) {
    if (member.defaultBranchId) uniqueBranchSet.add(member.defaultBranchId);
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

export const provisionEmployee = async (
  actor: StaffActorContext,
  input: CreateStaffInput
) => {
  assertRoleEscalationGuard(actor.role, input.role);

  const roleValid = await staffRepo.verifyTenantRoleSlugExists(actor.tenantId, input.role);
  if (!roleValid) {
    throw new Error(`Role '${input.role}' does not exist in your organization.`);
  }

  const requestedBranchIds = [
    input.defaultBranchId,
    ...input.branchMemberships.map((m) => m.branchId),
  ];

  const authorized = await getUserAuthorizedBranches(
    actor.tenantId,
    actor.userId,
    actor.role
  );
  if (authorized !== 'ALL') {
    const unauthorizedBranch = requestedBranchIds.find((id) => !authorized.includes(id));
    if (unauthorizedBranch !== undefined) {
      throw new Error('You cannot assign an employee to a branch outside your clearance.');
    }
  }

  const branchesValid = await staffRepo.verifyTenantBranchesExist(
    actor.tenantId,
    requestedBranchIds
  );
  if (!branchesValid) {
    throw new Error('One or more selected branches are invalid or inactive.');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : null;

  return await staffRepo.createStaffTransaction(
    actor.tenantId,
    {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      role: input.role,
      defaultBranchId: input.defaultBranchId,
      passwordHash,
      pinHash,
      branchMemberships: input.branchMemberships,
    },
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const modifyEmployee = async (
  actor: StaffActorContext,
  staffId: number,
  input: UpdateStaffInput
) => {
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

  const branchIdsToVerify: number[] = [];
  if (input.defaultBranchId) branchIdsToVerify.push(input.defaultBranchId);
  if (input.branchMemberships) {
    branchIdsToVerify.push(...input.branchMemberships.map((m) => m.branchId));
  }

  if (branchIdsToVerify.length > 0) {
    const authorized = await getUserAuthorizedBranches(
      actor.tenantId,
      actor.userId,
      actor.role
    );
    if (authorized !== 'ALL') {
      const unauthorizedBranch = branchIdsToVerify.find((id) => !authorized.includes(id));
      if (unauthorizedBranch !== undefined) {
        throw new Error('You cannot assign an employee to a branch outside your clearance.');
      }
    }

    const branchesValid = await staffRepo.verifyTenantBranchesExist(
      actor.tenantId,
      branchIdsToVerify
    );
    if (!branchesValid) {
      throw new Error('One or more selected branches are invalid or inactive.');
    }
  }

  const passwordHash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
  const pinHash = input.pin ? await bcrypt.hash(input.pin, 10) : undefined;

  return await staffRepo.updateStaffTransaction(
    actor.tenantId,
    staffId,
    {
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
    },
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const setEmployeeStatus = async (
  actor: StaffActorContext,
  staffId: number,
  isActive: boolean,
  reason?: string
) => {
  if (!isActive && staffId === actor.userId) {
    throw new Error('You cannot suspend your own active operator account.');
  }

  const existing = await staffRepo.findStaffById(actor.tenantId, staffId);
  if (!existing) return null;

  assertRoleEscalationGuard(actor.role, existing.role);

  return await staffRepo.updateStaffTransaction(
    actor.tenantId,
    staffId,
    { isActive, reason },
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const resetEmployeePin = async (
  actor: StaffActorContext,
  staffId: number,
  pin: string
) => {
  const existing = await staffRepo.findStaffById(actor.tenantId, staffId);
  if (!existing) return null;

  assertRoleEscalationGuard(actor.role, existing.role);

  const pinHash = await bcrypt.hash(pin, 10);
  return await staffRepo.updateStaffPinTransaction(actor.tenantId, staffId, pinHash, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};