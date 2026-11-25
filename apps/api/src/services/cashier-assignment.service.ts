// apps/api/src/services/cashier-assignment.service.ts
import * as assignmentRepo from '../repositories/cashier-assignment.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  ListCashierAssignmentsQuery,
  AssignmentContextQuery,
  CreateCashierAssignmentInput,
  UpdateCashierAssignmentInput,
} from '../validators/cashier-assignment.validator';

export interface CustodyActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

async function resolveBranchScope(
  actor: CustodyActorContext,
  requestedBranchId?: number
): Promise<{
  authorizedBranchIds: number[] | null;
  effectiveBranchIds: number[] | null;
}> {
  const authorized = await getUserAuthorizedBranches(
    actor.tenantId,
    actor.userId,
    actor.role
  );
  const authorizedBranchIds = authorized === 'ALL' ? null : authorized;

  if (requestedBranchId !== undefined) {
    if (authorizedBranchIds !== null && !authorizedBranchIds.includes(requestedBranchId)) {
      throw new Error('You do not have custody management clearance for the selected branch.');
    }
    return { authorizedBranchIds, effectiveBranchIds: [requestedBranchId] };
  }

  return { authorizedBranchIds, effectiveBranchIds: authorizedBranchIds };
}

export const fetchAssignments = async (
  actor: CustodyActorContext,
  query: ListCashierAssignmentsQuery
) => {
  const { effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
  return await assignmentRepo.listCashierAssignments(actor.tenantId, {
    startDate: query.startDate,
    endDate: query.endDate,
    effectiveBranchIds,
    status: query.status,
    userId: query.userId,
  });
};

export const fetchAssignmentContext = async (
  actor: CustodyActorContext,
  query: AssignmentContextQuery
) => {
  const { authorizedBranchIds, effectiveBranchIds } = await resolveBranchScope(
    actor,
    query.branchId
  );
  return await assignmentRepo.getAssignmentContext(
    actor.tenantId,
    authorizedBranchIds,
    effectiveBranchIds
  );
};

export const createCustodyAssignment = async (
  actor: CustodyActorContext,
  input: CreateCashierAssignmentInput
) => {
  await resolveBranchScope(actor, input.branchId);
  return await assignmentRepo.assignCashierTransaction(
    actor.tenantId,
    actor.userId,
    input,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const modifyCustodyAssignment = async (
  actor: CustodyActorContext,
  assignmentId: number,
  input: UpdateCashierAssignmentInput
) => {
  const existing = await assignmentRepo.findAssignmentById(actor.tenantId, assignmentId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  return await assignmentRepo.updateAssignmentTransaction(
    actor.tenantId,
    assignmentId,
    input,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const revokeCustodyAssignment = async (
  actor: CustodyActorContext,
  assignmentId: number,
  reason: string
) => {
  const existing = await assignmentRepo.findAssignmentById(actor.tenantId, assignmentId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  return await assignmentRepo.revokeAssignmentTransaction(
    actor.tenantId,
    assignmentId,
    reason,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};