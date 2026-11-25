// apps/api/src/services/attendance.service.ts
import * as attendanceRepo from '../repositories/attendance.repository';
import { getUserAuthorizedBranches } from './role.service';
import type {
  ListAttendanceQuery,
  LiveDutyQuery,
  ClockInInput,
  ClockOutInput,
  ManualAdjustmentInput,
} from '../validators/attendance.validator';

export interface AttendanceActorContext {
  tenantId: number;
  userId: number;
  role: string;
  ipAddress?: string | null;
}

async function resolveBranchScope(
  actor: AttendanceActorContext,
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
      throw new Error('You do not have attendance clearance for the selected branch.');
    }
    return [requestedBranchId];
  }

  return authorizedIds;
}

export const fetchAttendanceLedger = async (
  actor: AttendanceActorContext,
  query: ListAttendanceQuery
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
  return await attendanceRepo.listAttendanceRecords(actor.tenantId, {
    startDate: query.startDate,
    endDate: query.endDate,
    effectiveBranchIds,
    userId: query.userId,
    status: query.status,
  });
};

export const fetchLiveDutyRoster = async (
  actor: AttendanceActorContext,
  query: LiveDutyQuery
) => {
  const effectiveBranchIds = await resolveBranchScope(actor, query.branchId);
  return await attendanceRepo.getLiveDutyRoster(actor.tenantId, effectiveBranchIds);
};

export const recordClockIn = async (
  actor: AttendanceActorContext,
  input: ClockInInput
) => {
  await resolveBranchScope(actor, input.branchId);
  return await attendanceRepo.clockInTransaction(actor.tenantId, input, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};

export const recordClockOut = async (
  actor: AttendanceActorContext,
  input: ClockOutInput
) => {
  const session = await attendanceRepo.findActiveSessionById(
    actor.tenantId,
    input.attendanceId
  );
  if (!session) {
    throw new Error('Active shift session not found.');
  }
  await resolveBranchScope(actor, session.branchId);

  return await attendanceRepo.clockOutTransaction(actor.tenantId, input, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};

export const recordManualAdjustment = async (
  actor: AttendanceActorContext,
  input: ManualAdjustmentInput
) => {
  await resolveBranchScope(actor, input.branchId);
  return await attendanceRepo.createManualAdjustmentTransaction(actor.tenantId, input, {
    userId: actor.userId,
    role: actor.role,
    ipAddress: actor.ipAddress,
  });
};

export const approveTimesheets = async (
  actor: AttendanceActorContext,
  recordIds: number[]
) => {
  const effectiveBranchIds = await resolveBranchScope(actor);
  const res = await attendanceRepo.batchReviewAttendanceTransaction(
    actor.tenantId,
    recordIds,
    effectiveBranchIds,
    'APPROVED',
    { userId: actor.userId, role: actor.role, ipAddress: actor.ipAddress }
  );
  return { approvedCount: res.count };
};

export const rejectTimesheets = async (
  actor: AttendanceActorContext,
  recordIds: number[],
  reason: string
) => {
  const effectiveBranchIds = await resolveBranchScope(actor);
  const res = await attendanceRepo.batchReviewAttendanceTransaction(
    actor.tenantId,
    recordIds,
    effectiveBranchIds,
    'REJECTED',
    { userId: actor.userId, role: actor.role, ipAddress: actor.ipAddress },
    reason
  );
  return { rejectedCount: res.count };
};