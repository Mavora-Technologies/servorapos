// apps/api/src/repositories/schedule.repository.ts
import {
  eq,
  and,
  gte,
  lte,
  ne,
  asc,
  desc,
  inArray,
  or,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../config/db';
import {
  workSchedules,
  shiftTemplates,
  users,
  branches,
  roles,
  userBranchMemberships,
  tenantFinancialSettings,
  auditLogs,
} from '../config/schema';
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateTemplateInput,
} from '../validators/schedule.validator';

export interface ScheduleAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export interface ScopedRosterFilters {
  weekStart: string;
  weekEnd: string;
  authorizedBranchIds: number[] | null; // null = all tenant branches
  effectiveBranchIds: number[] | null; // active filter slice
  role?: string;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toMinuteInterval(startTime: string, endTime: string): [number, number] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 24 * 60; // Overnight shift
  return [start, end];
}

function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const [s1, e1] = toMinuteInterval(aStart, aEnd);
  const [s2, e2] = toMinuteInterval(bStart, bEnd);
  return s1 < e2 && e1 > s2;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
}

/**
 * Verifies that an employee holds active clearance for the target branch
 * (ADMIN/SUPER_ADMIN have tenant-wide clearance; all other staff must match
 * an active user_branch_memberships row or their defaultBranchId fallback).
 */
async function assertEmployeeBranchClearance(
  tx: DbTransaction,
  tenantId: number,
  staff: { id: number; role: string; defaultBranchId: number | null },
  targetBranchId: number
): Promise<void> {
  if (staff.role === 'ADMIN' || staff.role === 'SUPER_ADMIN') {
    return;
  }

  const memberships = await tx
    .select({ branchId: userBranchMemberships.branchId })
    .from(userBranchMemberships)
    .innerJoin(
      branches,
      and(
        eq(userBranchMemberships.branchId, branches.id),
        eq(branches.tenantId, tenantId),
        eq(branches.isActive, true)
      )
    )
    .where(
      and(
        eq(userBranchMemberships.tenantId, tenantId),
        eq(userBranchMemberships.userId, staff.id),
        eq(userBranchMemberships.isActive, true)
      )
    );

  const allowedIds =
    memberships.length > 0
      ? memberships.map((m) => m.branchId)
      : staff.defaultBranchId
        ? [staff.defaultBranchId]
        : [];

  if (!allowedIds.includes(targetBranchId)) {
    throw new Error(
      'Branch clearance violation: Employee is not assigned to the selected outlet. Grant outlet clearance in the Employee Directory first.'
    );
  }
}

export const getWeeklyRoster = async (tenantId: number, filters: ScopedRosterFilters) => {
  const shiftConditions: SQL[] = [
    eq(workSchedules.tenantId, tenantId),
    gte(workSchedules.shiftDate, filters.weekStart),
    lte(workSchedules.shiftDate, filters.weekEnd),
    ne(workSchedules.status, 'CANCELLED'),
  ];

  if (filters.role) {
    shiftConditions.push(eq(workSchedules.role, filters.role));
  }

  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) {
      shiftConditions.push(sql`FALSE`);
    } else {
      shiftConditions.push(inArray(workSchedules.branchId, filters.effectiveBranchIds));
    }
  }

  // Staff scope: active employees assigned to any branch in effectiveBranchIds
  const staffConditions: SQL[] = [eq(users.tenantId, tenantId), eq(users.isActive, true)];
  if (filters.role) {
    staffConditions.push(eq(users.role, filters.role));
  }
  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) {
      staffConditions.push(sql`FALSE`);
    } else {
      const memberSubquery = db
        .select({ userId: userBranchMemberships.userId })
        .from(userBranchMemberships)
        .where(
          and(
            eq(userBranchMemberships.tenantId, tenantId),
            eq(userBranchMemberships.isActive, true),
            inArray(userBranchMemberships.branchId, filters.effectiveBranchIds)
          )
        );
      const branchMatch = or(
        inArray(users.defaultBranchId, filters.effectiveBranchIds),
        inArray(users.id, memberSubquery)
      );
      if (branchMatch) staffConditions.push(branchMatch);
    }
  }

  // Authorized branch dropdown (never narrowed by selected branchId)
  const branchConditions: SQL[] = [eq(branches.tenantId, tenantId), eq(branches.isActive, true)];
  if (filters.authorizedBranchIds !== null) {
    if (filters.authorizedBranchIds.length === 0) {
      branchConditions.push(sql`FALSE`);
    } else {
      branchConditions.push(inArray(branches.id, filters.authorizedBranchIds));
    }
  }

  // Templates: global (branchId IS NULL) or scoped to authorized branches
  const templateConditions: SQL[] = [eq(shiftTemplates.tenantId, tenantId)];
  if (filters.authorizedBranchIds !== null) {
    if (filters.authorizedBranchIds.length === 0) {
      templateConditions.push(isNull(shiftTemplates.branchId));
    } else {
      const tplBranchMatch = or(
        isNull(shiftTemplates.branchId),
        inArray(shiftTemplates.branchId, filters.authorizedBranchIds)
      );
      if (tplBranchMatch) templateConditions.push(tplBranchMatch);
    }
  }

  const [
    shifts,
    activeStaff,
    activeMemberships,
    activeBranches,
    templates,
    tenantRoles,
    [finSettings],
  ] = await Promise.all([
    db
      .select({
        id: workSchedules.id,
        shiftDate: workSchedules.shiftDate,
        startTime: workSchedules.startTime,
        endTime: workSchedules.endTime,
        breakMinutes: workSchedules.breakMinutes,
        role: workSchedules.role,
        status: workSchedules.status,
        hourlyWage: workSchedules.hourlyWage,
        notes: workSchedules.notes,
        templateId: workSchedules.templateId,
        branchId: workSchedules.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        userId: workSchedules.userId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
      })
      .from(workSchedules)
      .innerJoin(users, and(eq(workSchedules.userId, users.id), eq(users.tenantId, tenantId)))
      .innerJoin(
        branches,
        and(eq(workSchedules.branchId, branches.id), eq(branches.tenantId, tenantId))
      )
      .where(and(...shiftConditions))
      .orderBy(asc(workSchedules.shiftDate), asc(workSchedules.startTime)),

    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(...staffConditions))
      .orderBy(asc(users.firstName), asc(users.lastName)),

    db
      .select({
        userId: userBranchMemberships.userId,
        branchId: userBranchMemberships.branchId,
      })
      .from(userBranchMemberships)
      .innerJoin(
        branches,
        and(
          eq(userBranchMemberships.branchId, branches.id),
          eq(branches.tenantId, tenantId),
          eq(branches.isActive, true)
        )
      )
      .where(
        and(
          eq(userBranchMemberships.tenantId, tenantId),
          eq(userBranchMemberships.isActive, true)
        )
      ),

    db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        isMainBranch: branches.isMainBranch,
      })
      .from(branches)
      .where(and(...branchConditions))
      .orderBy(desc(branches.isMainBranch), asc(branches.name)),

    db
      .select()
      .from(shiftTemplates)
      .where(and(...templateConditions))
      .orderBy(asc(shiftTemplates.startTime)),

    db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
      })
      .from(roles)
      .where(
        or(eq(roles.tenantId, tenantId), and(eq(roles.isSystemRole, true), isNull(roles.tenantId)))
      )
      .orderBy(asc(roles.name)),

    db
      .select({
        baseCurrency: tenantFinancialSettings.baseCurrency,
        standardWorkWeekHours: tenantFinancialSettings.standardWorkWeekHours,
        defaultOvertimeMultiplier: tenantFinancialSettings.defaultOvertimeMultiplier,
      })
      .from(tenantFinancialSettings)
      .where(eq(tenantFinancialSettings.tenantId, tenantId))
      .limit(1),
  ]);

  const membershipMap = new Map<number, number[]>();
  for (const m of activeMemberships) {
    const list = membershipMap.get(m.userId) ?? [];
    list.push(m.branchId);
    membershipMap.set(m.userId, list);
  }

  const allAuthorizedBranchIds = activeBranches.map((b) => b.id);

  const enrichedStaff = activeStaff.map((s) => {
    let assignedBranchIds: number[];
    if (s.role === 'ADMIN' || s.role === 'SUPER_ADMIN') {
      assignedBranchIds = allAuthorizedBranchIds;
    } else {
      const memberBranches = membershipMap.get(s.id) ?? [];
      assignedBranchIds =
        memberBranches.length > 0
          ? memberBranches
          : s.defaultBranchId
            ? [s.defaultBranchId]
            : [];
    }

    return {
      ...s,
      assignedBranchIds,
    };
  });

  return {
    shifts,
    staff: enrichedStaff,
    branches: activeBranches,
    templates,
    roles: tenantRoles,
    laborPolicy: {
      currency: finSettings?.baseCurrency ?? 'KES',
      standardWorkWeekHours: finSettings?.standardWorkWeekHours ?? 40,
      overtimeMultiplier: parseFloat(finSettings?.defaultOvertimeMultiplier ?? '1.50') || 1.5,
    },
  };
};

export const findScheduleById = async (tenantId: number, scheduleId: number) => {
  const [row] = await db
    .select()
    .from(workSchedules)
    .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
    .limit(1);

  return row ?? null;
};

export const createScheduleTransaction = async (
  tenantId: number,
  input: CreateScheduleInput,
  actor: ScheduleAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [[staffRow], [branchRow]] = await Promise.all([
      tx
        .select({
          id: users.id,
          role: users.role,
          defaultBranchId: users.defaultBranchId,
        })
        .from(users)
        .where(
          and(eq(users.id, input.userId), eq(users.tenantId, tenantId), eq(users.isActive, true))
        )
        .limit(1),
      tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.id, input.branchId),
            eq(branches.tenantId, tenantId),
            eq(branches.isActive, true)
          )
        )
        .limit(1),
    ]);

    if (!staffRow) throw new Error('Selected employee does not exist or is inactive.');
    if (!branchRow) throw new Error('Selected branch does not exist or is inactive.');

    // Enforce employee outlet clearance guardrail
    await assertEmployeeBranchClearance(tx, tenantId, staffRow, input.branchId);

    const existingShifts = await tx
      .select({
        id: workSchedules.id,
        startTime: workSchedules.startTime,
        endTime: workSchedules.endTime,
      })
      .from(workSchedules)
      .where(
        and(
          eq(workSchedules.tenantId, tenantId),
          eq(workSchedules.userId, input.userId),
          eq(workSchedules.shiftDate, input.shiftDate),
          ne(workSchedules.status, 'CANCELLED')
        )
      );

    const conflict = existingShifts.find((s) =>
      intervalsOverlap(input.startTime, input.endTime, s.startTime, s.endTime)
    );
    if (conflict) {
      throw new Error(
        `Scheduling conflict: Employee already has an overlapping shift (${conflict.startTime}–${conflict.endTime}) on ${input.shiftDate}.`
      );
    }

    const [created] = await tx
      .insert(workSchedules)
      .values({
        tenantId,
        branchId: input.branchId,
        userId: input.userId,
        templateId: input.templateId ?? null,
        shiftDate: input.shiftDate,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        role: input.role,
        hourlyWage: (input.hourlyWage ?? 0).toFixed(2),
        status: 'DRAFT',
        notes: input.notes ?? null,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: created.branchId,
      userId: actor.userId,
      action: 'SHIFT_ALLOCATED',
      module: 'WORKFORCE_HCM',
      entityType: 'work_schedules',
      entityId: String(created.id),
      newValues: {
        userId: created.userId,
        branchId: created.branchId,
        shiftDate: created.shiftDate,
        startTime: created.startTime,
        endTime: created.endTime,
        role: created.role,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return created;
  });
};

export const updateScheduleTransaction = async (
  tenantId: number,
  scheduleId: number,
  input: UpdateScheduleInput,
  actor: ScheduleAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(workSchedules)
      .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;

    const nextUserId = input.userId ?? existing.userId;
    const nextBranchId = input.branchId ?? existing.branchId;
    const nextDate = input.shiftDate ?? existing.shiftDate;
    const nextStart = input.startTime ?? existing.startTime;
    const nextEnd = input.endTime ?? existing.endTime;
    const nextStatus = input.status ?? existing.status;

    if (nextStart === nextEnd) {
      throw new Error('Start time and end time cannot be identical.');
    }

    const [[staffRow], [branchRow]] = await Promise.all([
      tx
        .select({
          id: users.id,
          role: users.role,
          defaultBranchId: users.defaultBranchId,
        })
        .from(users)
        .where(
          and(eq(users.id, nextUserId), eq(users.tenantId, tenantId), eq(users.isActive, true))
        )
        .limit(1),
      tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.id, nextBranchId),
            eq(branches.tenantId, tenantId),
            eq(branches.isActive, true)
          )
        )
        .limit(1),
    ]);

    if (!staffRow) throw new Error('Selected employee does not exist or is inactive.');
    if (!branchRow) throw new Error('Selected branch does not exist or is inactive.');

    if (nextStatus !== 'CANCELLED') {
      // Enforce employee outlet clearance guardrail on active shifts
      await assertEmployeeBranchClearance(tx, tenantId, staffRow, nextBranchId);

      const siblingShifts = await tx
        .select({
          id: workSchedules.id,
          startTime: workSchedules.startTime,
          endTime: workSchedules.endTime,
        })
        .from(workSchedules)
        .where(
          and(
            eq(workSchedules.tenantId, tenantId),
            eq(workSchedules.userId, nextUserId),
            eq(workSchedules.shiftDate, nextDate),
            ne(workSchedules.id, scheduleId),
            ne(workSchedules.status, 'CANCELLED')
          )
        );

      const conflict = siblingShifts.find((s) =>
        intervalsOverlap(nextStart, nextEnd, s.startTime, s.endTime)
      );
      if (conflict) {
        throw new Error(
          `Scheduling conflict: Employee already has an overlapping shift (${conflict.startTime}–${conflict.endTime}) on ${nextDate}.`
        );
      }
    }

    const [updated] = await tx
      .update(workSchedules)
      .set({
        userId: nextUserId,
        branchId: nextBranchId,
        shiftDate: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
        breakMinutes: input.breakMinutes ?? existing.breakMinutes,
        role: input.role ?? existing.role,
        hourlyWage:
          input.hourlyWage !== undefined ? input.hourlyWage.toFixed(2) : existing.hourlyWage,
        status: nextStatus,
        notes: input.notes !== undefined ? input.notes : existing.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: updated.branchId,
      userId: actor.userId,
      action: 'SHIFT_UPDATED',
      module: 'WORKFORCE_HCM',
      entityType: 'work_schedules',
      entityId: String(updated.id),
      previousValues: {
        shiftDate: existing.shiftDate,
        startTime: existing.startTime,
        endTime: existing.endTime,
        branchId: existing.branchId,
        status: existing.status,
      },
      newValues: {
        shiftDate: updated.shiftDate,
        startTime: updated.startTime,
        endTime: updated.endTime,
        branchId: updated.branchId,
        status: updated.status,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};

export const deleteScheduleTransaction = async (
  tenantId: number,
  scheduleId: number,
  actor: ScheduleAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(workSchedules)
      .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
      .returning();

    if (!deleted) return null;

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: deleted.branchId,
      userId: actor.userId,
      action: 'SHIFT_DELETED',
      module: 'WORKFORCE_HCM',
      entityType: 'work_schedules',
      entityId: String(deleted.id),
      previousValues: {
        userId: deleted.userId,
        shiftDate: deleted.shiftDate,
        startTime: deleted.startTime,
        endTime: deleted.endTime,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return deleted;
  });
};

export const publishWeekTransaction = async (
  tenantId: number,
  weekStart: string,
  effectiveBranchIds: number[] | null,
  actor: ScheduleAuditActor
) => {
  const weekEnd = addDaysToIsoDate(weekStart, 6);

  return await db.transaction(async (tx) => {
    const conditions: SQL[] = [
      eq(workSchedules.tenantId, tenantId),
      gte(workSchedules.shiftDate, weekStart),
      lte(workSchedules.shiftDate, weekEnd),
      eq(workSchedules.status, 'DRAFT'),
    ];

    if (effectiveBranchIds !== null) {
      if (effectiveBranchIds.length === 0) return { publishedCount: 0 };
      conditions.push(inArray(workSchedules.branchId, effectiveBranchIds));
    }

    const updated = await tx
      .update(workSchedules)
      .set({ status: 'PUBLISHED', updatedAt: new Date() })
      .where(and(...conditions))
      .returning({ id: workSchedules.id, branchId: workSchedules.branchId });

    if (updated.length > 0) {
      await tx.insert(auditLogs).values({
        tenantId,
        branchId: effectiveBranchIds?.length === 1 ? effectiveBranchIds[0] : null,
        userId: actor.userId,
        action: 'ROSTER_WEEK_PUBLISHED',
        module: 'WORKFORCE_HCM',
        entityType: 'work_schedules',
        entityId: weekStart,
        newValues: { weekStart, weekEnd, publishedCount: updated.length },
        ipAddress: actor.ipAddress ?? null,
      });
    }

    return { publishedCount: updated.length };
  });
};

export const copyWeekTransaction = async (
  tenantId: number,
  fromWeekStart: string,
  toWeekStart: string,
  effectiveBranchIds: number[] | null,
  actor: ScheduleAuditActor
) => {
  const fromWeekEnd = addDaysToIsoDate(fromWeekStart, 6);
  const toWeekEnd = addDaysToIsoDate(toWeekStart, 6);

  return await db.transaction(async (tx) => {
    const sourceConditions: SQL[] = [
      eq(workSchedules.tenantId, tenantId),
      gte(workSchedules.shiftDate, fromWeekStart),
      lte(workSchedules.shiftDate, fromWeekEnd),
      ne(workSchedules.status, 'CANCELLED'),
    ];

    const targetConditions: SQL[] = [
      eq(workSchedules.tenantId, tenantId),
      gte(workSchedules.shiftDate, toWeekStart),
      lte(workSchedules.shiftDate, toWeekEnd),
      ne(workSchedules.status, 'CANCELLED'),
    ];

    if (effectiveBranchIds !== null) {
      if (effectiveBranchIds.length === 0) {
        return { copiedCount: 0, skippedConflicts: 0 };
      }
      sourceConditions.push(inArray(workSchedules.branchId, effectiveBranchIds));
      targetConditions.push(inArray(workSchedules.branchId, effectiveBranchIds));
    }

    const [sourceShifts, existingTargetShifts, activeStaffRows, activeMemberships] =
      await Promise.all([
        tx
          .select()
          .from(workSchedules)
          .where(and(...sourceConditions)),
        tx
          .select({
            userId: workSchedules.userId,
            shiftDate: workSchedules.shiftDate,
            startTime: workSchedules.startTime,
            endTime: workSchedules.endTime,
          })
          .from(workSchedules)
          .where(and(...targetConditions)),
        tx
          .select({
            id: users.id,
            role: users.role,
            defaultBranchId: users.defaultBranchId,
          })
          .from(users)
          .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))),
        tx
          .select({
            userId: userBranchMemberships.userId,
            branchId: userBranchMemberships.branchId,
          })
          .from(userBranchMemberships)
          .innerJoin(
            branches,
            and(
              eq(userBranchMemberships.branchId, branches.id),
              eq(branches.tenantId, tenantId),
              eq(branches.isActive, true)
            )
          )
          .where(
            and(
              eq(userBranchMemberships.tenantId, tenantId),
              eq(userBranchMemberships.isActive, true)
            )
          ),
      ]);

    if (sourceShifts.length === 0) {
      throw new Error('No active shifts found in the source week to copy.');
    }

    const staffMap = new Map(activeStaffRows.map((u) => [u.id, u]));
    const membershipMap = new Map<number, Set<number>>();
    for (const m of activeMemberships) {
      const set = membershipMap.get(m.userId) ?? new Set<number>();
      set.add(m.branchId);
      membershipMap.set(m.userId, set);
    }

    const fromStartMs = Date.parse(`${fromWeekStart}T00:00:00.000Z`);
    const toInsert: Array<typeof workSchedules.$inferInsert> = [];
    let skippedConflicts = 0;

    for (const shift of sourceShifts) {
      const staff = staffMap.get(shift.userId);
      if (!staff) {
        skippedConflicts += 1;
        continue;
      }

      // Skip shifts where employee no longer has clearance for that branch
      if (staff.role !== 'ADMIN' && staff.role !== 'SUPER_ADMIN') {
        const mems = membershipMap.get(staff.id);
        const hasClearance =
          mems && mems.size > 0
            ? mems.has(shift.branchId)
            : staff.defaultBranchId === shift.branchId;
        if (!hasClearance) {
          skippedConflicts += 1;
          continue;
        }
      }

      const shiftMs = Date.parse(`${shift.shiftDate}T00:00:00.000Z`);
      const dayOffset = Math.round((shiftMs - fromStartMs) / (1000 * 60 * 60 * 24));
      const targetDate = addDaysToIsoDate(toWeekStart, dayOffset);

      const hasConflict = existingTargetShifts.some(
        (t) =>
          t.userId === shift.userId &&
          t.shiftDate === targetDate &&
          intervalsOverlap(shift.startTime, shift.endTime, t.startTime, t.endTime)
      );

      if (hasConflict) {
        skippedConflicts += 1;
        continue;
      }

      toInsert.push({
        tenantId,
        branchId: shift.branchId,
        userId: shift.userId,
        templateId: shift.templateId,
        shiftDate: targetDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        role: shift.role,
        hourlyWage: shift.hourlyWage,
        status: 'DRAFT',
        notes: shift.notes,
      });
    }

    const inserted =
      toInsert.length > 0 ? await tx.insert(workSchedules).values(toInsert).returning() : [];

    if (inserted.length > 0) {
      await tx.insert(auditLogs).values({
        tenantId,
        branchId: effectiveBranchIds?.length === 1 ? effectiveBranchIds[0] : null,
        userId: actor.userId,
        action: 'ROSTER_WEEK_COPIED',
        module: 'WORKFORCE_HCM',
        entityType: 'work_schedules',
        entityId: toWeekStart,
        newValues: {
          fromWeekStart,
          toWeekStart,
          copiedCount: inserted.length,
          skippedConflicts,
        },
        ipAddress: actor.ipAddress ?? null,
      });
    }

    return { copiedCount: inserted.length, skippedConflicts };
  });
};

export const createShiftTemplateTransaction = async (
  tenantId: number,
  input: CreateTemplateInput,
  actor: ScheduleAuditActor
) => {
  return await db.transaction(async (tx) => {
    if (input.branchId) {
      const [branchRow] = await tx
        .select({ id: branches.id })
        .from(branches)
        .where(
          and(
            eq(branches.id, input.branchId),
            eq(branches.tenantId, tenantId),
            eq(branches.isActive, true)
          )
        )
        .limit(1);
      if (!branchRow) throw new Error('Selected branch does not exist or is inactive.');
    }

    const [created] = await tx
      .insert(shiftTemplates)
      .values({
        tenantId,
        branchId: input.branchId ?? null,
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        colorHex: input.colorHex,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: created.branchId,
      userId: actor.userId,
      action: 'SHIFT_TEMPLATE_CREATED',
      module: 'WORKFORCE_HCM',
      entityType: 'shift_templates',
      entityId: String(created.id),
      newValues: {
        name: created.name,
        startTime: created.startTime,
        endTime: created.endTime,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return created;
  });
};