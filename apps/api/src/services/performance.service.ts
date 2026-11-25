// apps/api/src/services/performance.service.ts
import * as perfRepo from '../repositories/performance.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  ListReviewsQuery,
  TelemetryQuery,
  CreateReviewInput,
  UpdateReviewInput,
} from '../validators/performance.validator';

export interface PerformanceActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

async function resolveBranchScope(
  actor: PerformanceActorContext,
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
      throw new Error('You do not have performance clearance for the selected branch.');
    }
    return { authorizedBranchIds, effectiveBranchIds: [requestedBranchId] };
  }

  return { authorizedBranchIds, effectiveBranchIds: authorizedBranchIds };
}

export const fetchPerformanceReviews = async (
  actor: PerformanceActorContext,
  query: ListReviewsQuery
) => {
  const { effectiveBranchIds } = await resolveBranchScope(actor, query.branchId);
  return await perfRepo.listPerformanceReviews(actor.tenantId, {
    cycle: query.cycle,
    role: query.role,
    userId: query.userId,
    effectiveBranchIds,
    status: query.status,
    minRating: query.minRating,
    startDate: query.startDate,
    endDate: query.endDate,
  });
};

export const fetchLiveTelemetry = async (
  actor: PerformanceActorContext,
  query: TelemetryQuery
) => {
  const { authorizedBranchIds, effectiveBranchIds } = await resolveBranchScope(
    actor,
    query.branchId
  );
  return await perfRepo.getLiveStaffTelemetry(actor.tenantId, {
    authorizedBranchIds,
    effectiveBranchIds,
    role: query.role,
    startDate: query.startDate,
    endDate: query.endDate,
  });
};

export const removeDraftAppraisal = async (
  actor: PerformanceActorContext,
  reviewId: number
) => {
  const existing = await perfRepo.findReviewById(actor.tenantId, reviewId);
  if (!existing) return null;

  if (existing.employeeDefaultBranchId) {
    await resolveBranchScope(actor, existing.employeeDefaultBranchId);
  }

  return await perfRepo.deleteDraftReviewTransaction(actor.tenantId, reviewId, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const submitAppraisal = async (
  actor: PerformanceActorContext,
  input: CreateReviewInput
) => {
  if (
    input.userId === actor.userId &&
    actor.role !== 'ADMIN' &&
    actor.role !== 'SUPER_ADMIN'
  ) {
    throw new Error('Governance control: Managers cannot submit formal appraisals on themselves.');
  }

  return await perfRepo.createReviewTransaction(actor.tenantId, actor.userId, input, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const modifyAppraisal = async (
  actor: PerformanceActorContext,
  reviewId: number,
  input: UpdateReviewInput
) => {
  const existing = await perfRepo.findReviewById(actor.tenantId, reviewId);
  if (!existing) return null;

  if (existing.employeeDefaultBranchId) {
    await resolveBranchScope(actor, existing.employeeDefaultBranchId);
  }

  return await perfRepo.updateReviewTransaction(actor.tenantId, reviewId, input, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const acknowledgeAppraisal = async (
  actor: PerformanceActorContext,
  reviewId: number,
  employeeFeedback?: string
) => {
  return await perfRepo.acknowledgeReviewTransaction(
    actor.tenantId,
    reviewId,
    actor.userId,
    employeeFeedback,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};