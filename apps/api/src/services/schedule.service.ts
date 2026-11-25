// apps/api/src/services/schedule.service.ts
import * as scheduleRepo from '../repositories/schedule.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  GetRosterQuery,
  CreateScheduleInput,
  UpdateScheduleInput,
  PublishWeekInput,
  CopyWeekInput,
  CreateTemplateInput,
} from '../validators/schedule.validator';

export interface ScheduleActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

function addSixDays(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 6));
  return dt.toISOString().split('T')[0];
}

async function resolveBranchScope(
  actor: ScheduleActorContext,
  requestedBranchId?: number | null
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

  if (requestedBranchId) {
    if (authorizedBranchIds !== null && !authorizedBranchIds.includes(requestedBranchId)) {
      throw new Error('You do not have scheduling clearance for the selected branch.');
    }
    return { authorizedBranchIds, effectiveBranchIds: [requestedBranchId] };
  }

  return { authorizedBranchIds, effectiveBranchIds: authorizedBranchIds };
}

export const fetchWeeklyRoster = async (
  actor: ScheduleActorContext,
  query: GetRosterQuery
) => {
  const { authorizedBranchIds, effectiveBranchIds } = await resolveBranchScope(
    actor,
    query.branchId
  );

  return await scheduleRepo.getWeeklyRoster(actor.tenantId, {
    weekStart: query.weekStart,
    weekEnd: addSixDays(query.weekStart),
    authorizedBranchIds,
    effectiveBranchIds,
    role: query.role,
  });
};

export const allocateShift = async (
  actor: ScheduleActorContext,
  input: CreateScheduleInput
) => {
  await resolveBranchScope(actor, input.branchId);
  return await scheduleRepo.createScheduleTransaction(actor.tenantId, input, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const modifyShift = async (
  actor: ScheduleActorContext,
  scheduleId: number,
  input: UpdateScheduleInput
) => {
  const existing = await scheduleRepo.findScheduleById(actor.tenantId, scheduleId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);
  if (input.branchId && input.branchId !== existing.branchId) {
    await resolveBranchScope(actor, input.branchId);
  }

  return await scheduleRepo.updateScheduleTransaction(actor.tenantId, scheduleId, input, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const removeShift = async (
  actor: ScheduleActorContext,
  scheduleId: number
) => {
  const existing = await scheduleRepo.findScheduleById(actor.tenantId, scheduleId);
  if (!existing) return null;

  await resolveBranchScope(actor, existing.branchId);

  return await scheduleRepo.deleteScheduleTransaction(actor.tenantId, scheduleId, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};

export const publishWeeklyRoster = async (
  actor: ScheduleActorContext,
  input: PublishWeekInput
) => {
  const { effectiveBranchIds } = await resolveBranchScope(actor, input.branchId);
  return await scheduleRepo.publishWeekTransaction(
    actor.tenantId,
    input.weekStart,
    effectiveBranchIds,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const replicateWeeklyRoster = async (
  actor: ScheduleActorContext,
  input: CopyWeekInput
) => {
  const { effectiveBranchIds } = await resolveBranchScope(actor, input.branchId);
  return await scheduleRepo.copyWeekTransaction(
    actor.tenantId,
    input.fromWeekStart,
    input.toWeekStart,
    effectiveBranchIds,
    { userId: actor.userId, ipAddress: actor.ipAddress }
  );
};

export const provisionShiftTemplate = async (
  actor: ScheduleActorContext,
  input: CreateTemplateInput
) => {
  if (input.branchId) {
    await resolveBranchScope(actor, input.branchId);
  }
  return await scheduleRepo.createShiftTemplateTransaction(actor.tenantId, input, {
    userId: actor.userId,
    ipAddress: actor.ipAddress,
  });
};