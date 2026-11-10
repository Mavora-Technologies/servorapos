"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShiftPreset = exports.copyWeekRoster = exports.publishWeek = exports.deleteScheduleEntry = exports.updateScheduleEntry = exports.createScheduleEntry = exports.getWeeklyRoster = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getWeeklyRoster = async (tenantId, filters) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, filters.weekStart),
        (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, filters.weekEnd),
        ...(filters.branchId ? [(0, drizzle_orm_1.eq)(schema_1.workSchedules.branchId, filters.branchId)] : []),
        ...(filters.role && filters.role !== 'ALL' ? [(0, drizzle_orm_1.eq)(schema_1.workSchedules.role, filters.role)] : []),
    ];
    const shifts = await db_1.db
        .select({
        id: schema_1.workSchedules.id,
        shiftDate: schema_1.workSchedules.shiftDate,
        startTime: schema_1.workSchedules.startTime,
        endTime: schema_1.workSchedules.endTime,
        breakMinutes: schema_1.workSchedules.breakMinutes,
        role: schema_1.workSchedules.role,
        status: schema_1.workSchedules.status,
        hourlyWage: schema_1.workSchedules.hourlyWage,
        notes: schema_1.workSchedules.notes,
        templateId: schema_1.workSchedules.templateId,
        branchId: schema_1.workSchedules.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        userId: schema_1.workSchedules.userId,
        userFirstName: schema_1.users.firstName,
        userLastName: schema_1.users.lastName,
        userEmail: schema_1.users.email,
    })
        .from(schema_1.workSchedules)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, schema_1.users.id))
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.workSchedules.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.workSchedules.shiftDate), (0, drizzle_orm_1.asc)(schema_1.workSchedules.startTime));
    // Retrieve tenant staff roster and branches for matrix mapping
    const [activeStaff, activeBranches, templates] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            role: schema_1.users.role,
            defaultBranchId: schema_1.users.defaultBranchId,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName)),
        db_1.db
            .select({
            id: schema_1.branches.id,
            name: schema_1.branches.name,
            code: schema_1.branches.code,
        })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true))),
        db_1.db
            .select()
            .from(schema_1.shiftTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.shiftTemplates.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.shiftTemplates.startTime)),
    ]);
    return {
        shifts,
        staff: activeStaff,
        branches: activeBranches,
        templates,
    };
};
exports.getWeeklyRoster = getWeeklyRoster;
const createScheduleEntry = async (tenantId, input) => {
    // Overlap protection check: prevent scheduling the same user on overlapping shifts on the same day
    const existingShifts = await db_1.db
        .select()
        .from(schema_1.workSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.shiftDate, input.shiftDate), (0, drizzle_orm_1.sql) `${schema_1.workSchedules.status} != 'CANCELLED'`));
    const newStart = input.startTime;
    const newEnd = input.endTime;
    const hasOverlap = existingShifts.some((s) => {
        return (newStart < s.endTime && newEnd > s.startTime);
    });
    if (hasOverlap) {
        throw new Error('Scheduling conflict: Employee already has an overlapping shift on this date.');
    }
    const [created] = await db_1.db
        .insert(schema_1.workSchedules)
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
exports.createScheduleEntry = createScheduleEntry;
const updateScheduleEntry = async (tenantId, scheduleId, input) => {
    const [existing] = await db_1.db
        .select()
        .from(schema_1.workSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Shift schedule entry not found.');
    }
    const [updated] = await db_1.db
        .update(schema_1.workSchedules)
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
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.updateScheduleEntry = updateScheduleEntry;
const deleteScheduleEntry = async (tenantId, scheduleId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.workSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
        .returning();
    if (!deleted) {
        throw new Error('Shift entry not found.');
    }
    return deleted;
};
exports.deleteScheduleEntry = deleteScheduleEntry;
const publishWeek = async (tenantId, weekStart, branchId) => {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const weekEndStr = endDate.toISOString().split('T')[0];
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, weekStart),
        (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, weekEndStr),
        (0, drizzle_orm_1.eq)(schema_1.workSchedules.status, 'DRAFT'),
        ...(branchId ? [(0, drizzle_orm_1.eq)(schema_1.workSchedules.branchId, branchId)] : []),
    ];
    const updated = await db_1.db
        .update(schema_1.workSchedules)
        .set({ status: 'PUBLISHED', updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)(...conditions))
        .returning();
    return { publishedCount: updated.length };
};
exports.publishWeek = publishWeek;
const copyWeekRoster = async (tenantId, fromWeekStart, toWeekStart, branchId) => {
    const fromStart = new Date(fromWeekStart);
    const fromEnd = new Date(fromStart);
    fromEnd.setDate(fromStart.getDate() + 6);
    const fromEndStr = fromEnd.toISOString().split('T')[0];
    const toStart = new Date(toWeekStart);
    const sourceShifts = await db_1.db
        .select()
        .from(schema_1.workSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, fromWeekStart), (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, fromEndStr), ...(branchId ? [(0, drizzle_orm_1.eq)(schema_1.workSchedules.branchId, branchId)] : [])));
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
    const inserted = await db_1.db.insert(schema_1.workSchedules).values(newRecords).returning();
    return { copiedCount: inserted.length };
};
exports.copyWeekRoster = copyWeekRoster;
const createShiftPreset = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.shiftTemplates)
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
exports.createShiftPreset = createShiftPreset;
