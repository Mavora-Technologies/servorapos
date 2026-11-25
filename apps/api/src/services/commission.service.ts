// apps/api/src/services/commission.service.ts
import * as commissionRepo from '../repositories/commission.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  CreateCommissionPlanInput,
  UpdateCommissionPlanInput,
  PreviewCommissionQuery,
  GeneratePayoutRunInput,
  SettlePayoutRunInput,
} from '../validators/commission.validator';

export interface CommissionActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

async function resolveBranchScope(
  actor: CommissionActorContext,
  requestedBranchId?: number | null
): Promise<number[] | null> {
  const authorized = await getUserAuthorizedBranches(
    actor.tenantId,
    actor.userId,
    actor.role
  );
  const authorizedIds = authorized === 'ALL' ? null : authorized;

  if (requestedBranchId !== undefined && requestedBranchId !== null) {
    if (authorizedIds !== null && !authorizedIds.includes(requestedBranchId)) {
      throw new Error('You do not have commission clearance for the selected branch.');
    }
    return [requestedBranchId];
  }

  return authorizedIds;
}

export const fetchPlans = async (
  actor: CommissionActorContext,
  branchId?: number
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, branchId);
  return await commissionRepo.listCommissionPlans(actor.tenantId, effectiveBranchIds);
};

export const provisionPlan = async (
  actor: CommissionActorContext,
  input: CreateCommissionPlanInput
) => {
  if (input.branchId) {
    await resolveBranchScope(actor, input.branchId);
  }
  return await commissionRepo.createCommissionPlanTransaction(actor.tenantId, input, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};

export const modifyPlan = async (
  actor: CommissionActorContext,
  planId: number,
  input: UpdateCommissionPlanInput
) => {
  if (input.branchId) {
    await resolveBranchScope(actor, input.branchId);
  }
  return await commissionRepo.updateCommissionPlanTransaction(actor.tenantId, planId, input, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};

export const previewCommissions = async (
  actor: CommissionActorContext,
  query: PreviewCommissionQuery
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
  return await commissionRepo.computeLiveCommissions(
    actor.tenantId,
    query.periodStart,
    query.periodEnd,
    effectiveBranchIds
  );
};

export const fetchPayoutRuns = async (
  actor: CommissionActorContext,
  branchId?: number
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, branchId);
  return await commissionRepo.listPayoutRuns(actor.tenantId, effectiveBranchIds);
};

export const generateRun = async (
  actor: CommissionActorContext,
  input: GeneratePayoutRunInput
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, input.branchId);
  return await commissionRepo.generatePayoutRunTransaction(
    actor.tenantId,
    input.periodStart,
    input.periodEnd,
    input.branchId ?? null,
    effectiveBranchIds,
    input.notes ?? null,
    {
      userId: actor.userId,
      role: actor.role,
      ipAddress: actor.ipAddress,
    }
  );
};

export const approveRun = async (actor: CommissionActorContext, runId: number) => {
  return await commissionRepo.approvePayoutRunTransaction(actor.tenantId, runId, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};

export const settleRun = async (
  actor: CommissionActorContext,
  runId: number,
  input: SettlePayoutRunInput
) => {
  return await commissionRepo.settlePayoutRunTransaction(actor.tenantId, runId, input, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};