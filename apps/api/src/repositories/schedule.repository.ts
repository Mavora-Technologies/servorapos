import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { db } from '../config/db';
import { workSchedules, shiftTemplates, users, branches, roles } from '../config/schema';
import {
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateTemplateInput,
} from '../validators/schedule.validator';

export interface RosterFilters {
  weekStart: string; // "YYYY-MM-DD"
  weekEnd: string;   // "YYYY-MM-DD"
  branchId?: number;
  role?: string;
}

export const getWeeklyRoster = async (tenantId: number, filters: RosterFilters) => {
  const conditions = [
    eq(workSchedules.tenantId, tenantId),
    gte(workSchedules.shiftDate, filters.weekStart),
    lte(workSchedules.shiftDate, filters.weekEnd),
    ...(filters.branchId ? [eq(workSchedules.branchId, filters.branchId)] : []),
    ...(filters.role && filters.role !== 'ALL' ? [eq(workSchedules.role, filters.role)] : []),
  ];

  const shifts = await db
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
    .innerJoin(users, eq(workSchedules.userId, users.id))
    .innerJoin(branches, eq(workSchedules.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(asc(workSchedules.shiftDate), asc(workSchedules.startTime));

  // Retrieve tenant staff roster and branches for matrix mapping
  const [activeStaff, activeBranches, templates] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.firstName)),
    db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
      })
      .from(branches)
      .where(and(eq(branches.tenantId, tenantId), eq(branches.isActive, true))),
    db
      .select()
      .from(shiftTemplates)
      .where(eq(shiftTemplates.tenantId, tenantId))
      .orderBy(asc(shiftTemplates.startTime)),
  ]);

  return {
    shifts,
    staff: activeStaff,
    branches: activeBranches,
    templates,
  };
};

export const createScheduleEntry = async (tenantId: number, input: CreateScheduleInput) => {
  // Overlap protection check: prevent scheduling the same user on overlapping shifts on the same day
  const existingShifts = await db
    .select()
    .from(workSchedules)
    .where(
      and(
        eq(workSchedules.tenantId, tenantId),
        eq(workSchedules.userId, input.userId),
        eq(workSchedules.shiftDate, input.shiftDate),
        sql`${workSchedules.status} != 'CANCELLED'`
      )
    );

  const newStart = input.startTime;
  const newEnd = input.endTime;

  const hasOverlap = existingShifts.some((s) => {
    return (newStart < s.endTime && newEnd > s.startTime);
  });

  if (hasOverlap) {
    throw new Error('Scheduling conflict: Employee already has an overlapping shift on this date.');
  }

  const [created] = await db
    .insert(workSchedules)
    .values({
      tenantId,
      branchId: input.branchId,
      userId: input.userId,
      templateId: input.templateId || null,
      shiftDate: input.shiftDate,
      startTime: input.startTime,
      endTime: input.endTime,
      breakMinutes: input.breakMinutes,
      role: input.role,
      hourlyWage: input.hourlyWage ? String(input.hourlyWage) : '0.00',
      status: 'DRAFT',
      notes: input.notes || null,
    })
    .returning();

  return created;
};

export const updateScheduleEntry = async (
  tenantId: number,
  scheduleId: number,
  input: UpdateScheduleInput
) => {
  const [existing] = await db
    .select()
    .from(workSchedules)
    .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    throw new Error('Shift schedule entry not found.');
  }

  const [updated] = await db
    .update(workSchedules)
    .set({
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...(input.shiftDate ? { shiftDate: input.shiftDate } : {}),
      ...(input.startTime ? { startTime: input.startTime } : {}),
      ...(input.endTime ? { endTime: input.endTime } : {}),
      ...(input.breakMinutes !== undefined ? { breakMinutes: input.breakMinutes } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.hourlyWage !== undefined ? { hourlyWage: String(input.hourlyWage) } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
    .returning();

  return updated;
};

export const deleteScheduleEntry = async (tenantId: number, scheduleId: number) => {
  const [deleted] = await db
    .delete(workSchedules)
    .where(and(eq(workSchedules.id, scheduleId), eq(workSchedules.tenantId, tenantId)))
    .returning();

  if (!deleted) {
    throw new Error('Shift entry not found.');
  }

  return deleted;
};

export const publishWeek = async (tenantId: number, weekStart: string, branchId?: number) => {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const weekEndStr = endDate.toISOString().split('T')[0];

  const conditions = [
    eq(workSchedules.tenantId, tenantId),
    gte(workSchedules.shiftDate, weekStart),
    lte(workSchedules.shiftDate, weekEndStr),
    eq(workSchedules.status, 'DRAFT'),
    ...(branchId ? [eq(workSchedules.branchId, branchId)] : []),
  ];

  const updated = await db
    .update(workSchedules)
    .set({ status: 'PUBLISHED', updatedAt: new Date() })
    .where(and(...conditions))
    .returning();

  return { publishedCount: updated.length };
};

export const copyWeekRoster = async (
  tenantId: number,
  fromWeekStart: string,
  toWeekStart: string,
  branchId?: number
) => {
  const fromStart = new Date(fromWeekStart);
  const fromEnd = new Date(fromStart);
  fromEnd.setDate(fromStart.getDate() + 6);
  const fromEndStr = fromEnd.toISOString().split('T')[0];

  const toStart = new Date(toWeekStart);

  const sourceShifts = await db
    .select()
    .from(workSchedules)
    .where(
      and(
        eq(workSchedules.tenantId, tenantId),
        gte(workSchedules.shiftDate, fromWeekStart),
        lte(workSchedules.shiftDate, fromEndStr),
        ...(branchId ? [eq(workSchedules.branchId, branchId)] : [])
      )
    );

  if (sourceShifts.length === 0) {
    throw new Error('No shifts found in the source week to copy.');
  }

  const newRecords = sourceShifts.map((shift) => {
    const shiftDate = new Date(shift.shiftDate);
    const dayOffset = Math.round((shiftDate.getTime() - fromStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const targetDate = new Date(toStart);
    targetDate.setDate(toStart.getDate() + dayOffset);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    return {
      tenantId,
      branchId: shift.branchId,
      userId: shift.userId,
      templateId: shift.templateId,
      shiftDate: targetDateStr,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      role: shift.role,
      hourlyWage: shift.hourlyWage,
      status: 'DRAFT',
      notes: shift.notes,
    };
  });

  const inserted = await db.insert(workSchedules).values(newRecords).returning();
  return { copiedCount: inserted.length };
};

export const createShiftPreset = async (tenantId: number, input: CreateTemplateInput) => {
  const [created] = await db
    .insert(shiftTemplates)
    .values({
      tenantId,
      branchId: input.branchId || null,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      breakMinutes: input.breakMinutes,
      colorHex: input.colorHex,
    })
    .returning();

  return created;
};