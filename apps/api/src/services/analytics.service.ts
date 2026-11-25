// apps/api/src/services/analytics.service.ts
import * as analyticsRepo from '../repositories/analytics.repository';
import { getUserAuthorizedBranches } from './role.service';
import type { DashboardAnalyticsQuery } from '../validators/analytics.validator';

export class ForbiddenBranchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenBranchError';
  }
}

export const fetchExecutiveDashboard = async (
  context: { tenantId: number; userId: number; role: string },
  query: DashboardAnalyticsQuery
) => {
  const authorized = await getUserAuthorizedBranches(
    context.tenantId,
    context.userId,
    context.role
  );

  const authorizedBranchIds: number[] | null = authorized === 'ALL' ? null : authorized;
  let effectiveBranchIds: number[] | null = authorizedBranchIds;

  if (query.branchId !== null) {
    if (authorized !== 'ALL' && !authorized.includes(query.branchId)) {
      throw new ForbiddenBranchError(
        'You do not have clearance to inspect analytics for the selected branch.'
      );
    }
    effectiveBranchIds = [query.branchId];
  }

  return await analyticsRepo.getExecutiveDashboardMetrics(context.tenantId, {
    ...query,
    authorizedBranchIds,
    effectiveBranchIds,
  });
};