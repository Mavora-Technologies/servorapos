// apps/api/src/services/branch.service.ts
import * as branchRepo from '../repositories/branch.repository';
import { getUserAuthorizedBranches } from './role.service';
import type { CreateBranchInput, UpdateBranchInput } from '../validators/branch.validator';

export interface BranchActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

export const listAuthorizedBranches = async (actor: BranchActorContext) => {
  const authorized = await getUserAuthorizedBranches(
    actor.tenantId,
    actor.userId,
    actor.role
  );

  const scope = authorized === 'ALL' ? null : authorized;
  return await branchRepo.findBranchesByTenantScope(actor.tenantId, scope);
};

export const provisionBranch = async (
  actor: BranchActorContext,
  payload: CreateBranchInput
) => {
  return await branchRepo.createBranchTransaction(actor.tenantId, payload, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const modifyBranch = async (
  actor: BranchActorContext,
  branchId: number,
  payload: UpdateBranchInput
) => {
  return await branchRepo.updateBranchTransaction(actor.tenantId, branchId, payload, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const toggleBranchActiveState = async (
  actor: BranchActorContext,
  branchId: number
) => {
  return await branchRepo.toggleBranchStatusTransaction(actor.tenantId, branchId, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};