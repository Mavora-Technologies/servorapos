// apps/api/src/services/handover.service.ts
import * as handoverRepo from '../repositories/handover.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  ListHandoversQuery,
  HandoverContextQuery,
  CreateHandoverInput,
  UpdateHandoverInput,
} from '../validators/handover.validator';

export interface HandoverActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

async function resolveBranchScope(
  actor: HandoverActorContext,
  requestedBranchId?: number
): Promise<number[] | null> {
  const authorized = await getUserAuthorizedBranches(
    actor.tenantId,
    actor.userId,
    actor.role
  );
  const authorizedIds = authorized === 'ALL' ? null : authorized;

  if (requestedBranchId !== undefined) {
    if (authorizedIds !== null && !authorizedIds.includes(requestedBranchId)) {
      throw new Error('You do not have handover clearance for the selected branch.');
    }
    return [requestedBranchId];
  }

  return authorizedIds;
}

export const fetchHandoverLogs = async (
  actor: HandoverActorContext,
  query: ListHandoversQuery
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
  return await handoverRepo.listHandovers(actor.tenantId, {
    startDate: query.startDate,
    endDate: query.endDate,
    effectiveBranchIds,
    shiftType: query.shiftType,
    status: query.status,
  });
};

export const fetchHandoverById = async (
  actor: HandoverActorContext,
  handoverId: number
) => {
  const record = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
  if (!record) return null;

  await resolveBranchScope(actor, record.branchId);
  return record;
};

export const fetchBranchContextSnapshot = async (
  actor: HandoverActorContext,
  query: HandoverContextQuery
) => {
  await resolveBranchScope(actor, query.branchId);
  return await handoverRepo.getBranchHandoverContext(
    actor.tenantId,
    query.branchId,
    query.date
  );
};

export const submitHandover = async (
  actor: HandoverActorContext,
  input: CreateHandoverInput
) => {
  await resolveBranchScope(actor, input.branchId);
  return await handoverRepo.createHandoverTransaction(
    actor.tenantId,
    actor.userId,
    input,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const modifyHandover = async (
  actor: HandoverActorContext,
  handoverId: number,
  input: UpdateHandoverInput
) => {
  const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  return await handoverRepo.updateHandoverTransaction(
    actor.tenantId,
    handoverId,
    input,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const countersignHandover = async (
  actor: HandoverActorContext,
  handoverId: number,
  notes?: string
) => {
  const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  return await handoverRepo.acknowledgeHandoverTransaction(
    actor.tenantId,
    handoverId,
    actor.userId,
    notes,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const escalateHandoverDispute = async (
  actor: HandoverActorContext,
  handoverId: number,
  reason: string
) => {
  const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  return await handoverRepo.disputeHandoverTransaction(
    actor.tenantId,
    handoverId,
    actor.userId,
    reason,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const resolveHandoverDispute = async (
  actor: HandoverActorContext,
  handoverId: number,
  resolutionNotes: string,
  postGlAdjustment: boolean
) => {
  const existing = await handoverRepo.findHandoverById(actor.tenantId, handoverId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  return await handoverRepo.resolveDisputedHandoverTransaction(
    actor.tenantId,
    handoverId,
    resolutionNotes,
    postGlAdjustment,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};