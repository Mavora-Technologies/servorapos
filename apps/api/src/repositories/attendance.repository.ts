// apps/api/src/repositories/attendance.repository.ts
import { eq, and, desc, gte, lte, sql, inArray, ne, type SQL } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import {
  attendanceRecords,
  users,
  branches,
  workSchedules,
  userBranchMemberships,
  tenantFinancialSettings,
  auditLogs,
} from '../config/schema';
import type {
  ClockInInput,
  ClockOutInput,
  ManualAdjustmentInput,
} from '../validators/attendance.validator';

export interface AttendanceAuditActor {
  userId: number;
  role: string;
  ipAddress?: string | null;
}

export interface ScopedAttendanceFilters {
  startDate?: string;
  endDate?: string;
  effectiveBranchIds: number[] | null; // null = all tenant branches
  userId?: number;
  status?: string;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseStartBoundary(dateStr: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00.000Z`)
    : new Date(dateStr);
}

function parseEndBoundary(dateStr: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T23:59:59.999Z`)
    : new Date(dateStr);
}

async function getDailyStandardHours(tx: DbTransaction, tenantId: number): Promise<number> {
  const [settings] = await tx
    .select({ standardWorkWeekHours: tenantFinancialSettings.standardWorkWeekHours })
    .from(tenantFinancialSettings)
    .where(eq(tenantFinancialSettings.tenantId, tenantId))
    .limit(1);

  const weekly = settings?.standardWorkWeekHours ?? 40;
  return Math.max(1, Number((weekly / 5).toFixed(2)));
}

async function assertEmployeeBranchClearance(
  tx: DbTransaction,
  tenantId: number,
  employee: { id: number; role: string; defaultBranchId: number | null },
  targetBranchId: number
): Promise<void> {
  if (employee.role === 'ADMIN' || employee.role === 'SUPER_ADMIN') {
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
        eq(userBranchMemberships.userId, employee.id),
        eq(userBranchMemberships.isActive, true)
      )
    );

  const allowedIds =
    memberships.length > 0
      ? memberships.map((m) => m.branchId)
      : employee.defaultBranchId
        ? [employee.defaultBranchId]
        : [];

  if (!allowedIds.includes(targetBranchId)) {
    throw new Error(
      'Branch clearance violation: Employee is not assigned to this outlet. Assign outlet clearance in the Employee Directory first.'
    );
  }
}

export const listAttendanceRecords = async (
  tenantId: number,
  filters: ScopedAttendanceFilters
) => {
  const conditions: SQL[] = [eq(attendanceRecords.tenantId, tenantId)];

  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) {
      return [];
    }
    conditions.push(inArray(attendanceRecords.branchId, filters.effectiveBranchIds));
  }

  if (filters.userId) {
    conditions.push(eq(attendanceRecords.userId, filters.userId));
  }
  if (filters.status) {
    conditions.push(eq(attendanceRecords.status, filters.status));
  }
  if (filters.startDate) {
    conditions.push(gte(attendanceRecords.clockInAt, parseStartBoundary(filters.startDate)));
  }
  if (filters.endDate) {
    conditions.push(lte(attendanceRecords.clockInAt, parseEndBoundary(filters.endDate)));
  }

  return await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      employeeName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      employeeRole: users.role,
      employeeEmail: users.email,
      branchId: attendanceRecords.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      scheduleId: attendanceRecords.scheduleId,
      scheduledStart: workSchedules.startTime,
      scheduledEnd: workSchedules.endTime,
      clockInAt: attendanceRecords.clockInAt,
      clockOutAt: attendanceRecords.clockOutAt,
      clockInMethod: attendanceRecords.clockInMethod,
      clockOutMethod: attendanceRecords.clockOutMethod,
      breakMinutes: attendanceRecords.breakMinutes,
      totalDurationMinutes: attendanceRecords.totalDurationMinutes,
      regularHours: attendanceRecords.regularHours,
      overtimeHours: attendanceRecords.overtimeHours,
      status: attendanceRecords.status,
      verificationStatus: attendanceRecords.verificationStatus,
      deviceInfo: attendanceRecords.deviceInfo,
      notes: attendanceRecords.notes,
      approvedAt: attendanceRecords.approvedAt,
    })
    .from(attendanceRecords)
    .innerJoin(users, and(eq(attendanceRecords.userId, users.id), eq(users.tenantId, tenantId)))
    .innerJoin(
      branches,
      and(eq(attendanceRecords.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .leftJoin(workSchedules, eq(attendanceRecords.scheduleId, workSchedules.id))
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.clockInAt))
    .limit(500);
};

export const getLiveDutyRoster = async (
  tenantId: number,
  effectiveBranchIds: number[] | null
) => {
  const conditions: SQL[] = [
    eq(attendanceRecords.tenantId, tenantId),
    eq(attendanceRecords.status, 'ON_DUTY'),
  ];

  if (effectiveBranchIds !== null) {
    if (effectiveBranchIds.length === 0) {
      return [];
    }
    conditions.push(inArray(attendanceRecords.branchId, effectiveBranchIds));
  }

  return await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      employeeName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      employeeRole: users.role,
      employeeEmail: users.email,
      branchId: attendanceRecords.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      clockInAt: attendanceRecords.clockInAt,
      clockInMethod: attendanceRecords.clockInMethod,
      deviceInfo: attendanceRecords.deviceInfo,
      verificationStatus: attendanceRecords.verificationStatus,
    })
    .from(attendanceRecords)
    .innerJoin(users, and(eq(attendanceRecords.userId, users.id), eq(users.tenantId, tenantId)))
    .innerJoin(
      branches,
      and(eq(attendanceRecords.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.clockInAt));
};

export const findActiveSessionById = async (tenantId: number, attendanceId: number) => {
  const [row] = await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      branchId: attendanceRecords.branchId,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .where(
      and(eq(attendanceRecords.id, attendanceId), eq(attendanceRecords.tenantId, tenantId))
    )
    .limit(1);

  return row ?? null;
};

export const clockInTransaction = async (
  tenantId: number,
  input: ClockInInput,
  actor: AttendanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [[employee], [branchRow]] = await Promise.all([
      tx
        .select({
          id: users.id,
          role: users.role,
          defaultBranchId: users.defaultBranchId,
          pinHash: users.pinHash,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)))
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

    if (!employee || !employee.isActive) {
      throw new Error('Employee account is inactive or not found.');
    }
    if (!branchRow) {
      throw new Error('Operating branch is inactive or not found.');
    }

    await assertEmployeeBranchClearance(tx, tenantId, employee, input.branchId);

    if (input.method === 'PIN') {
      if (!employee.pinHash || !input.pin) {
        throw new Error('Valid POS Fast-Login PIN is required for PIN clock-in.');
      }
      const isPinValid = await bcrypt.compare(input.pin, employee.pinHash);
      if (!isPinValid) {
        throw new Error('Invalid PIN authentication code.');
      }
    }

    const [activeSession] = await tx
      .select({ id: attendanceRecords.id })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.userId, input.userId),
          eq(attendanceRecords.status, 'ON_DUTY')
        )
      )
      .limit(1);

    if (activeSession) {
      throw new Error('Employee is already clocked in and active on duty.');
    }

    const now = new Date();
    const todayStr = formatLocalIsoDate(now);

    const [matchingSchedule] = await tx
      .select({
        id: workSchedules.id,
        startTime: workSchedules.startTime,
      })
      .from(workSchedules)
      .where(
        and(
          eq(workSchedules.tenantId, tenantId),
          eq(workSchedules.userId, input.userId),
          eq(workSchedules.branchId, input.branchId),
          eq(workSchedules.shiftDate, todayStr),
          ne(workSchedules.status, 'CANCELLED')
        )
      )
      .limit(1);

    let verificationStatus = 'VERIFIED';
    if (matchingSchedule?.startTime) {
      const [schedH, schedM] = matchingSchedule.startTime.split(':').map(Number);
      const scheduledStart = new Date(now);
      scheduledStart.setHours(schedH, schedM, 0, 0);

      // Flag as late arrival if > 10 minutes after scheduled start
      if (now.getTime() - scheduledStart.getTime() > 10 * 60 * 1000) {
        verificationStatus = 'LATE_ARRIVAL';
      }
    }

    const [record] = await tx
      .insert(attendanceRecords)
      .values({
        tenantId,
        userId: input.userId,
        branchId: input.branchId,
        scheduleId: matchingSchedule?.id ?? null,
        clockInAt: now,
        clockInMethod: input.method,
        status: 'ON_DUTY',
        verificationStatus,
        deviceInfo: input.deviceInfo || 'Servora Terminal',
        ipAddress: actor.ipAddress ?? null,
        notes: input.notes ?? null,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: record.branchId,
      userId: actor.userId,
      action: 'STAFF_CLOCK_IN',
      module: 'WORKFORCE_HCM',
      entityType: 'attendance_records',
      entityId: String(record.id),
      newValues: {
        employeeId: record.userId,
        branchId: record.branchId,
        method: record.clockInMethod,
        verificationStatus: record.verificationStatus,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return record;
  });
};

export const clockOutTransaction = async (
  tenantId: number,
  input: ClockOutInput,
  actor: AttendanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [session] = await tx
      .select({
        id: attendanceRecords.id,
        userId: attendanceRecords.userId,
        branchId: attendanceRecords.branchId,
        clockInAt: attendanceRecords.clockInAt,
        verificationStatus: attendanceRecords.verificationStatus,
        pinHash: users.pinHash,
      })
      .from(attendanceRecords)
      .innerJoin(users, and(eq(attendanceRecords.userId, users.id), eq(users.tenantId, tenantId)))
      .where(
        and(
          eq(attendanceRecords.id, input.attendanceId),
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.status, 'ON_DUTY')
        )
      )
      .limit(1);

    if (!session) {
      throw new Error('Active shift session not found or already clocked out.');
    }

    if (input.method === 'PIN') {
      if (!session.pinHash || !input.pin) {
        throw new Error('Valid PIN is required for clock-out authentication.');
      }
      const isPinValid = await bcrypt.compare(input.pin, session.pinHash);
      if (!isPinValid) {
        throw new Error('Invalid PIN authentication code.');
      }
    }

    const dailyStandardHours = await getDailyStandardHours(tx, tenantId);
    const clockOutTime = new Date();
    const rawMinutes = Math.max(
      0,
      Math.floor((clockOutTime.getTime() - session.clockInAt.getTime()) / (1000 * 60))
    );
    const netMinutes = Math.max(0, rawMinutes - input.breakMinutes);
    const netHours = netMinutes / 60;

    const regularHours = Math.min(dailyStandardHours, netHours);
    const overtimeHours = Math.max(0, netHours - dailyStandardHours);

    const [updated] = await tx
      .update(attendanceRecords)
      .set({
        clockOutAt: clockOutTime,
        clockOutMethod: input.method,
        breakMinutes: input.breakMinutes,
        totalDurationMinutes: netMinutes,
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        status: 'COMPLETED',
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(attendanceRecords.id, input.attendanceId), eq(attendanceRecords.tenantId, tenantId))
      )
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: session.branchId,
      userId: actor.userId,
      action: 'STAFF_CLOCK_OUT',
      module: 'WORKFORCE_HCM',
      entityType: 'attendance_records',
      entityId: String(updated.id),
      newValues: {
        employeeId: session.userId,
        totalDurationMinutes: netMinutes,
        regularHours: updated.regularHours,
        overtimeHours: updated.overtimeHours,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};

export const createManualAdjustmentTransaction = async (
  tenantId: number,
  input: ManualAdjustmentInput,
  actor: AttendanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const inDate = new Date(input.clockInAt);
    const outDate = new Date(input.clockOutAt);

    if (outDate <= inDate) {
      throw new Error('Clock-out timestamp must be strictly after clock-in.');
    }

    const [[employee], [branchRow]] = await Promise.all([
      tx
        .select({
          id: users.id,
          role: users.role,
          defaultBranchId: users.defaultBranchId,
          isActive: users.isActive,
        })
        .from(users)
        .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)))
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

    if (!employee || !employee.isActive) {
      throw new Error('Employee account is inactive or not found.');
    }
    if (!branchRow) {
      throw new Error('Operating branch is inactive or not found.');
    }

    await assertEmployeeBranchClearance(tx, tenantId, employee, input.branchId);

    const dailyStandardHours = await getDailyStandardHours(tx, tenantId);
    const rawMinutes = Math.floor((outDate.getTime() - inDate.getTime()) / (1000 * 60));
    const netMinutes = Math.max(0, rawMinutes - input.breakMinutes);
    const netHours = netMinutes / 60;

    const regularHours = Math.min(dailyStandardHours, netHours);
    const overtimeHours = Math.max(0, netHours - dailyStandardHours);

    const isSelfEntry =
      input.userId === actor.userId && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN';

    const [record] = await tx
      .insert(attendanceRecords)
      .values({
        tenantId,
        userId: input.userId,
        branchId: input.branchId,
        scheduleId: input.scheduleId ?? null,
        clockInAt: inDate,
        clockOutAt: outDate,
        clockInMethod: 'MANUAL_OVERRIDE',
        clockOutMethod: 'MANUAL_OVERRIDE',
        breakMinutes: input.breakMinutes,
        totalDurationMinutes: netMinutes,
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        status: isSelfEntry ? 'PENDING_REVIEW' : 'APPROVED',
        verificationStatus: 'MANUAL_ADJUSTMENT',
        approvedByUserId: isSelfEntry ? null : actor.userId,
        approvedAt: isSelfEntry ? null : new Date(),
        ipAddress: actor.ipAddress ?? null,
        notes: input.notes,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: record.branchId,
      userId: actor.userId,
      action: 'ATTENDANCE_MANUAL_ADJUSTMENT',
      module: 'WORKFORCE_HCM',
      entityType: 'attendance_records',
      entityId: String(record.id),
      reason: input.notes,
      newValues: {
        employeeId: record.userId,
        clockInAt: record.clockInAt,
        clockOutAt: record.clockOutAt,
        status: record.status,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    return record;
  });
};

export const batchReviewAttendanceTransaction = async (
  tenantId: number,
  recordIds: number[],
  effectiveBranchIds: number[] | null,
  decision: 'APPROVED' | 'REJECTED',
  actor: AttendanceAuditActor,
  reason?: string
) => {
  return await db.transaction(async (tx) => {
    const conditions: SQL[] = [
      eq(attendanceRecords.tenantId, tenantId),
      inArray(attendanceRecords.id, recordIds),
      inArray(attendanceRecords.status, ['COMPLETED', 'PENDING_REVIEW']),
    ];

    if (effectiveBranchIds !== null) {
      if (effectiveBranchIds.length === 0) return { count: 0 };
      conditions.push(inArray(attendanceRecords.branchId, effectiveBranchIds));
    }

    // Maker-checker guard: non-admins cannot self-approve their own timesheets
    if (decision === 'APPROVED' && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      conditions.push(ne(attendanceRecords.userId, actor.userId));
    }

    const updated = await tx
      .update(attendanceRecords)
      .set({
        status: decision,
        approvedByUserId: actor.userId,
        approvedAt: new Date(),
        ...(reason ? { notes: reason } : {}),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning({ id: attendanceRecords.id, branchId: attendanceRecords.branchId });

    if (updated.length > 0) {
      await tx.insert(auditLogs).values({
        tenantId,
        branchId: updated[0]?.branchId ?? null,
        userId: actor.userId,
        action:
          decision === 'APPROVED' ? 'ATTENDANCE_BATCH_APPROVED' : 'ATTENDANCE_BATCH_REJECTED',
        module: 'WORKFORCE_HCM',
        entityType: 'attendance_records',
        entityId: updated.map((u) => u.id).join(','),
        reason: reason ?? null,
        newValues: { count: updated.length, decision },
        ipAddress: actor.ipAddress ?? null,
      });
    }

    return { count: updated.length };
  });
};