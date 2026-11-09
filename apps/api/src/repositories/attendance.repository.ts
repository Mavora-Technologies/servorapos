import { eq, and, desc, gte, lte, sql, inArray, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../config/db';
import { attendanceRecords, users, branches, workSchedules } from '../config/schema';
import {
  ClockInInput,
  ClockOutInput,
  ManualAdjustmentInput,
} from '../validators/attendance.validator';

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  branchId?: number;
  userId?: number;
  status?: string;
}

export const listAttendanceRecords = async (tenantId: number, filters: AttendanceFilters) => {
  const conditions = [
    eq(attendanceRecords.tenantId, tenantId),
    filters.branchId ? eq(attendanceRecords.branchId, filters.branchId) : undefined,
    filters.userId ? eq(attendanceRecords.userId, filters.userId) : undefined,
    filters.status && filters.status !== 'ALL' ? eq(attendanceRecords.status, filters.status) : undefined,
    filters.startDate ? gte(attendanceRecords.clockInAt, new Date(filters.startDate)) : undefined,
    filters.endDate ? lte(attendanceRecords.clockInAt, new Date(filters.endDate)) : undefined,
  ].filter(Boolean);

  const records = await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      employeeName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
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
      notes: attendanceRecords.notes,
      approvedAt: attendanceRecords.approvedAt,
    })
    .from(attendanceRecords)
    .innerJoin(users, eq(attendanceRecords.userId, users.id))
    .innerJoin(branches, eq(attendanceRecords.branchId, branches.id))
    .leftJoin(workSchedules, eq(attendanceRecords.scheduleId, workSchedules.id))
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.clockInAt));

  return records;
};

export const getLiveDutyRoster = async (tenantId: number, branchId?: number) => {
  const conditions = [
    eq(attendanceRecords.tenantId, tenantId),
    eq(attendanceRecords.status, 'ON_DUTY'),
    branchId ? eq(attendanceRecords.branchId, branchId) : undefined,
  ].filter(Boolean);

  return await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      employeeName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      employeeRole: users.role,
      employeeEmail: users.email,
      branchId: attendanceRecords.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      clockInAt: attendanceRecords.clockInAt,
      clockInMethod: attendanceRecords.clockInMethod,
      deviceInfo: attendanceRecords.deviceInfo,
    })
    .from(attendanceRecords)
    .innerJoin(users, eq(attendanceRecords.userId, users.id))
    .innerJoin(branches, eq(attendanceRecords.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.clockInAt));
};

export const clockIn = async (tenantId: number, input: ClockInInput) => {
  const [employee] = await db
    .select({ id: users.id, pinHash: users.pinHash, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)))
    .limit(1);

  if (!employee || !employee.isActive) {
    throw new Error('Employee account is inactive or not found.');
  }

  if (input.method === 'PIN') {
    if (!employee.pinHash || !input.pin) {
      throw new Error('Valid POS Fast-Login PIN is required for PIN clock-in.');
    }
    const isPinValid = await bcrypt.compare(input.pin, employee.pinHash);
    if (!isPinValid) {
      throw new Error('Invalid PIN authentication code.');
    }
  }

  // Prevent multiple open clock-in sessions
  const [activeSession] = await db
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

  // Correlate with published work schedule for today to detect punctuality
  const todayStr = new Date().toISOString().split('T')[0];
  const [matchingSchedule] = await db
    .select({ id: workSchedules.id, startTime: workSchedules.startTime })
    .from(workSchedules)
    .where(
      and(
        eq(workSchedules.tenantId, tenantId),
        eq(workSchedules.userId, input.userId),
        eq(workSchedules.shiftDate, todayStr),
        sql`${workSchedules.status} != 'CANCELLED'`
      )
    )
    .limit(1);

  let verificationStatus = 'VERIFIED';
  if (matchingSchedule?.startTime) {
    const [schedH, schedM] = matchingSchedule.startTime.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(schedH, schedM, 0, 0);

    // Flag as late if clocked in > 10 minutes past scheduled start
    if (Date.now() - scheduledTime.getTime() > 10 * 60 * 1000) {
      verificationStatus = 'LATE_ARRIVAL';
    }
  }

  const [record] = await db
    .insert(attendanceRecords)
    .values({
      tenantId,
      userId: input.userId,
      branchId: input.branchId,
      scheduleId: matchingSchedule?.id || null,
      clockInAt: new Date(),
      clockInMethod: input.method,
      status: 'ON_DUTY',
      verificationStatus,
      deviceInfo: input.deviceInfo || 'Servora Terminal',
      notes: input.notes || null,
    })
    .returning();

  return record;
};

export const clockOut = async (tenantId: number, input: ClockOutInput) => {
  const [session] = await db
    .select({
      id: attendanceRecords.id,
      userId: attendanceRecords.userId,
      clockInAt: attendanceRecords.clockInAt,
      pinHash: users.pinHash,
    })
    .from(attendanceRecords)
    .innerJoin(users, eq(attendanceRecords.userId, users.id))
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

  const clockOutTime = new Date();
  const rawDiffMs = clockOutTime.getTime() - session.clockInAt.getTime();
  const rawMinutes = Math.max(0, Math.floor(rawDiffMs / (1000 * 60)));
  const netMinutes = Math.max(0, rawMinutes - input.breakMinutes);

  const netHours = netMinutes / 60;
  const regularHours = Math.min(8, netHours);
  const overtimeHours = Math.max(0, netHours - 8);

  const [updated] = await db
    .update(attendanceRecords)
    .set({
      clockOutAt: clockOutTime,
      clockOutMethod: input.method,
      breakMinutes: input.breakMinutes,
      totalDurationMinutes: netMinutes,
      regularHours: regularHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      status: 'COMPLETED',
      notes: input.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(attendanceRecords.id, input.attendanceId))
    .returning();

  return updated;
};

export const createManualAdjustment = async (
  tenantId: number,
  managerUserId: number,
  input: ManualAdjustmentInput
) => {
  const inDate = new Date(input.clockInAt);
  const outDate = new Date(input.clockOutAt);

  if (outDate <= inDate) {
    throw new Error('Clock-out timestamp must be strictly after clock-in.');
  }

  const rawMinutes = Math.floor((outDate.getTime() - inDate.getTime()) / (1000 * 60));
  const netMinutes = Math.max(0, rawMinutes - input.breakMinutes);
  const netHours = netMinutes / 60;

  const regularHours = Math.min(8, netHours);
  const overtimeHours = Math.max(0, netHours - 8);

  const [record] = await db
    .insert(attendanceRecords)
    .values({
      tenantId,
      userId: input.userId,
      branchId: input.branchId,
      scheduleId: input.scheduleId || null,
      clockInAt: inDate,
      clockOutAt: outDate,
      clockInMethod: 'MANUAL_OVERRIDE',
      clockOutMethod: 'MANUAL_OVERRIDE',
      breakMinutes: input.breakMinutes,
      totalDurationMinutes: netMinutes,
      regularHours: regularHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      status: 'APPROVED',
      verificationStatus: 'MANUAL_ADJUSTMENT',
      approvedByUserId: managerUserId,
      approvedAt: new Date(),
      notes: input.notes,
    })
    .returning();

  return record;
};

export const batchApproveAttendance = async (
  tenantId: number,
  managerUserId: number,
  recordIds: number[]
) => {
  const updated = await db
    .update(attendanceRecords)
    .set({
      status: 'APPROVED',
      approvedByUserId: managerUserId,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(attendanceRecords.tenantId, tenantId),
        inArray(attendanceRecords.id, recordIds),
        sql`${attendanceRecords.status} IN ('COMPLETED', 'PENDING_REVIEW')`
      )
    )
    .returning({ id: attendanceRecords.id });

  return { approvedCount: updated.length };
};