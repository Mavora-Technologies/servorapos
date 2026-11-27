"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShiftTemplateTransaction = exports.copyWeekTransaction = exports.publishWeekTransaction = exports.deleteScheduleTransaction = exports.updateScheduleTransaction = exports.createScheduleTransaction = exports.findScheduleById = exports.getWeeklyRoster = void 0;
// apps/api/src/repositories/schedule.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function toMinuteInterval(startTime, endTime) {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = sh * 60 + sm;
    let end = eh * 60 + em;
    if (end <= start)
        end += 24 * 60; // Overnight shift
    return [start, end];
}
function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
    const [s1, e1] = toMinuteInterval(aStart, aEnd);
    const [s2, e2] = toMinuteInterval(bStart, bEnd);
    return s1 < e2 && e1 > s2;
}
function addDaysToIsoDate(isoDate, days) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().split('T')[0];
}
/**
 * Verifies that an employee holds active clearance for the target branch
 * (ADMIN/SUPER_ADMIN have tenant-wide clearance; all other staff must match
 * an active user_branch_memberships row or their defaultBranchId fallback).
 */
async function assertEmployeeBranchClearance(tx, tenantId, staff, targetBranchId) {
    if (staff.role === 'ADMIN' || staff.role === 'SUPER_ADMIN') {
        return;
    }
    const memberships = await tx
        .select({ branchId: schema_1.userBranchMemberships.branchId })
        .from(schema_1.userBranchMemberships)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.userId, staff.id), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)));
    const allowedIds = memberships.length > 0
        ? memberships.map((m) => m.branchId)
        : staff.defaultBranchId
            ? [staff.defaultBranchId]
            : [];
    if (!allowedIds.includes(targetBranchId)) {
        throw new Error('Branch clearance violation: Employee is not assigned to the selected outlet. Grant outlet clearance in the Employee Directory first.');
    }
}
const getWeeklyRoster = async (tenantId, filters) => {
    const shiftConditions = [
        (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, filters.weekStart),
        (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, filters.weekEnd),
        (0, drizzle_orm_1.ne)(schema_1.workSchedules.status, 'CANCELLED'),
    ];
    if (filters.role) {
        shiftConditions.push((0, drizzle_orm_1.eq)(schema_1.workSchedules.role, filters.role));
    }
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0) {
            shiftConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        }
        else {
            shiftConditions.push((0, drizzle_orm_1.inArray)(schema_1.workSchedules.branchId, filters.effectiveBranchIds));
        }
    }
    // Staff scope: active employees assigned to any branch in effectiveBranchIds
    const staffConditions = [(0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)];
    if (filters.role) {
        staffConditions.push((0, drizzle_orm_1.eq)(schema_1.users.role, filters.role));
    }
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0) {
            staffConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        }
        else {
            const memberSubquery = db_1.db
                .select({ userId: schema_1.userBranchMemberships.userId })
                .from(schema_1.userBranchMemberships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.userBranchMemberships.branchId, filters.effectiveBranchIds)));
            const branchMatch = (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.defaultBranchId, filters.effectiveBranchIds), (0, drizzle_orm_1.inArray)(schema_1.users.id, memberSubquery));
            if (branchMatch)
                staffConditions.push(branchMatch);
        }
    }
    // Authorized branch dropdown (never narrowed by selected branchId)
    const branchConditions = [(0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)];
    if (filters.authorizedBranchIds !== null) {
        if (filters.authorizedBranchIds.length === 0) {
            branchConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        }
        else {
            branchConditions.push((0, drizzle_orm_1.inArray)(schema_1.branches.id, filters.authorizedBranchIds));
        }
    }
    // Templates: global (branchId IS NULL) or scoped to authorized branches
    const templateConditions = [(0, drizzle_orm_1.eq)(schema_1.shiftTemplates.tenantId, tenantId)];
    if (filters.authorizedBranchIds !== null) {
        if (filters.authorizedBranchIds.length === 0) {
            templateConditions.push((0, drizzle_orm_1.isNull)(schema_1.shiftTemplates.branchId));
        }
        else {
            const tplBranchMatch = (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.shiftTemplates.branchId), (0, drizzle_orm_1.inArray)(schema_1.shiftTemplates.branchId, filters.authorizedBranchIds));
            if (tplBranchMatch)
                templateConditions.push(tplBranchMatch);
        }
    }
    const [shifts, activeStaff, activeMemberships, activeBranches, templates, tenantRoles, [finSettings],] = await Promise.all([
        db_1.db
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
            .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...shiftConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.workSchedules.shiftDate), (0, drizzle_orm_1.asc)(schema_1.workSchedules.startTime)),
        db_1.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            role: schema_1.users.role,
            defaultBranchId: schema_1.users.defaultBranchId,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)(...staffConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName), (0, drizzle_orm_1.asc)(schema_1.users.lastName)),
        db_1.db
            .select({
            userId: schema_1.userBranchMemberships.userId,
            branchId: schema_1.userBranchMemberships.branchId,
        })
            .from(schema_1.userBranchMemberships)
            .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true))),
        db_1.db
            .select({
            id: schema_1.branches.id,
            name: schema_1.branches.name,
            code: schema_1.branches.code,
            isMainBranch: schema_1.branches.isMainBranch,
        })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)(...branchConditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.isMainBranch), (0, drizzle_orm_1.asc)(schema_1.branches.name)),
        db_1.db
            .select()
            .from(schema_1.shiftTemplates)
            .where((0, drizzle_orm_1.and)(...templateConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.shiftTemplates.startTime)),
        db_1.db
            .select({
            id: schema_1.roles.id,
            name: schema_1.roles.name,
            slug: schema_1.roles.slug,
        })
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true), (0, drizzle_orm_1.isNull)(schema_1.roles.tenantId))))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.roles.name)),
        db_1.db
            .select({
            baseCurrency: schema_1.tenantFinancialSettings.baseCurrency,
            standardWorkWeekHours: schema_1.tenantFinancialSettings.standardWorkWeekHours,
            defaultOvertimeMultiplier: schema_1.tenantFinancialSettings.defaultOvertimeMultiplier,
        })
            .from(schema_1.tenantFinancialSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
            .limit(1),
    ]);
    const membershipMap = new Map();
    for (const m of activeMemberships) {
        const list = membershipMap.get(m.userId) ?? [];
        list.push(m.branchId);
        membershipMap.set(m.userId, list);
    }
    const allAuthorizedBranchIds = activeBranches.map((b) => b.id);
    const enrichedStaff = activeStaff.map((s) => {
        let assignedBranchIds;
        if (s.role === 'ADMIN' || s.role === 'SUPER_ADMIN') {
            assignedBranchIds = allAuthorizedBranchIds;
        }
        else {
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
exports.getWeeklyRoster = getWeeklyRoster;
const findScheduleById = async (tenantId, scheduleId) => {
    const [row] = await db_1.db
        .select()
        .from(schema_1.workSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
        .limit(1);
    return row ?? null;
};
exports.findScheduleById = findScheduleById;
const createScheduleTransaction = async (tenantId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [[staffRow], [branchRow]] = await Promise.all([
            tx
                .select({
                id: schema_1.users.id,
                role: schema_1.users.role,
                defaultBranchId: schema_1.users.defaultBranchId,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
                .limit(1),
            tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
                .limit(1),
        ]);
        if (!staffRow)
            throw new Error('Selected employee does not exist or is inactive.');
        if (!branchRow)
            throw new Error('Selected branch does not exist or is inactive.');
        // Enforce employee outlet clearance guardrail
        await assertEmployeeBranchClearance(tx, tenantId, staffRow, input.branchId);
        const existingShifts = await tx
            .select({
            id: schema_1.workSchedules.id,
            startTime: schema_1.workSchedules.startTime,
            endTime: schema_1.workSchedules.endTime,
        })
            .from(schema_1.workSchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.shiftDate, input.shiftDate), (0, drizzle_orm_1.ne)(schema_1.workSchedules.status, 'CANCELLED')));
        const conflict = existingShifts.find((s) => intervalsOverlap(input.startTime, input.endTime, s.startTime, s.endTime));
        if (conflict) {
            throw new Error(`Scheduling conflict: Employee already has an overlapping shift (${conflict.startTime}–${conflict.endTime}) on ${input.shiftDate}.`);
        }
        const [created] = await tx
            .insert(schema_1.workSchedules)
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
        await tx.insert(schema_1.auditLogs).values({
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
exports.createScheduleTransaction = createScheduleTransaction;
const updateScheduleTransaction = async (tenantId, scheduleId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.workSchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
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
                id: schema_1.users.id,
                role: schema_1.users.role,
                defaultBranchId: schema_1.users.defaultBranchId,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, nextUserId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
                .limit(1),
            tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, nextBranchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
                .limit(1),
        ]);
        if (!staffRow)
            throw new Error('Selected employee does not exist or is inactive.');
        if (!branchRow)
            throw new Error('Selected branch does not exist or is inactive.');
        if (nextStatus !== 'CANCELLED') {
            // Enforce employee outlet clearance guardrail on active shifts
            await assertEmployeeBranchClearance(tx, tenantId, staffRow, nextBranchId);
            const siblingShifts = await tx
                .select({
                id: schema_1.workSchedules.id,
                startTime: schema_1.workSchedules.startTime,
                endTime: schema_1.workSchedules.endTime,
            })
                .from(schema_1.workSchedules)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, nextUserId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.shiftDate, nextDate), (0, drizzle_orm_1.ne)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.ne)(schema_1.workSchedules.status, 'CANCELLED')));
            const conflict = siblingShifts.find((s) => intervalsOverlap(nextStart, nextEnd, s.startTime, s.endTime));
            if (conflict) {
                throw new Error(`Scheduling conflict: Employee already has an overlapping shift (${conflict.startTime}–${conflict.endTime}) on ${nextDate}.`);
            }
        }
        const [updated] = await tx
            .update(schema_1.workSchedules)
            .set({
            userId: nextUserId,
            branchId: nextBranchId,
            shiftDate: nextDate,
            startTime: nextStart,
            endTime: nextEnd,
            breakMinutes: input.breakMinutes ?? existing.breakMinutes,
            role: input.role ?? existing.role,
            hourlyWage: input.hourlyWage !== undefined ? input.hourlyWage.toFixed(2) : existing.hourlyWage,
            status: nextStatus,
            notes: input.notes !== undefined ? input.notes : existing.notes,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
exports.updateScheduleTransaction = updateScheduleTransaction;
const deleteScheduleTransaction = async (tenantId, scheduleId, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [deleted] = await tx
            .delete(schema_1.workSchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.id, scheduleId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId)))
            .returning();
        if (!deleted)
            return null;
        await tx.insert(schema_1.auditLogs).values({
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
exports.deleteScheduleTransaction = deleteScheduleTransaction;
const publishWeekTransaction = async (tenantId, weekStart, effectiveBranchIds, actor) => {
    const weekEnd = addDaysToIsoDate(weekStart, 6);
    return await db_1.db.transaction(async (tx) => {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId),
            (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, weekStart),
            (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, weekEnd),
            (0, drizzle_orm_1.eq)(schema_1.workSchedules.status, 'DRAFT'),
        ];
        if (effectiveBranchIds !== null) {
            if (effectiveBranchIds.length === 0)
                return { publishedCount: 0 };
            conditions.push((0, drizzle_orm_1.inArray)(schema_1.workSchedules.branchId, effectiveBranchIds));
        }
        const updated = await tx
            .update(schema_1.workSchedules)
            .set({ status: 'PUBLISHED', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)(...conditions))
            .returning({ id: schema_1.workSchedules.id, branchId: schema_1.workSchedules.branchId });
        if (updated.length > 0) {
            await tx.insert(schema_1.auditLogs).values({
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
exports.publishWeekTransaction = publishWeekTransaction;
const copyWeekTransaction = async (tenantId, fromWeekStart, toWeekStart, effectiveBranchIds, actor) => {
    const fromWeekEnd = addDaysToIsoDate(fromWeekStart, 6);
    const toWeekEnd = addDaysToIsoDate(toWeekStart, 6);
    return await db_1.db.transaction(async (tx) => {
        const sourceConditions = [
            (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId),
            (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, fromWeekStart),
            (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, fromWeekEnd),
            (0, drizzle_orm_1.ne)(schema_1.workSchedules.status, 'CANCELLED'),
        ];
        const targetConditions = [
            (0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId),
            (0, drizzle_orm_1.gte)(schema_1.workSchedules.shiftDate, toWeekStart),
            (0, drizzle_orm_1.lte)(schema_1.workSchedules.shiftDate, toWeekEnd),
            (0, drizzle_orm_1.ne)(schema_1.workSchedules.status, 'CANCELLED'),
        ];
        if (effectiveBranchIds !== null) {
            if (effectiveBranchIds.length === 0) {
                return { copiedCount: 0, skippedConflicts: 0 };
            }
            sourceConditions.push((0, drizzle_orm_1.inArray)(schema_1.workSchedules.branchId, effectiveBranchIds));
            targetConditions.push((0, drizzle_orm_1.inArray)(schema_1.workSchedules.branchId, effectiveBranchIds));
        }
        const [sourceShifts, existingTargetShifts, activeStaffRows, activeMemberships] = await Promise.all([
            tx
                .select()
                .from(schema_1.workSchedules)
                .where((0, drizzle_orm_1.and)(...sourceConditions)),
            tx
                .select({
                userId: schema_1.workSchedules.userId,
                shiftDate: schema_1.workSchedules.shiftDate,
                startTime: schema_1.workSchedules.startTime,
                endTime: schema_1.workSchedules.endTime,
            })
                .from(schema_1.workSchedules)
                .where((0, drizzle_orm_1.and)(...targetConditions)),
            tx
                .select({
                id: schema_1.users.id,
                role: schema_1.users.role,
                defaultBranchId: schema_1.users.defaultBranchId,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true))),
            tx
                .select({
                userId: schema_1.userBranchMemberships.userId,
                branchId: schema_1.userBranchMemberships.branchId,
            })
                .from(schema_1.userBranchMemberships)
                .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true))),
        ]);
        if (sourceShifts.length === 0) {
            throw new Error('No active shifts found in the source week to copy.');
        }
        const staffMap = new Map(activeStaffRows.map((u) => [u.id, u]));
        const membershipMap = new Map();
        for (const m of activeMemberships) {
            const set = membershipMap.get(m.userId) ?? new Set();
            set.add(m.branchId);
            membershipMap.set(m.userId, set);
        }
        const fromStartMs = Date.parse(`${fromWeekStart}T00:00:00.000Z`);
        const toInsert = [];
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
                const hasClearance = mems && mems.size > 0
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
            const hasConflict = existingTargetShifts.some((t) => t.userId === shift.userId &&
                t.shiftDate === targetDate &&
                intervalsOverlap(shift.startTime, shift.endTime, t.startTime, t.endTime));
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
        const inserted = toInsert.length > 0 ? await tx.insert(schema_1.workSchedules).values(toInsert).returning() : [];
        if (inserted.length > 0) {
            await tx.insert(schema_1.auditLogs).values({
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
exports.copyWeekTransaction = copyWeekTransaction;
const createShiftTemplateTransaction = async (tenantId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        if (input.branchId) {
            const [branchRow] = await tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
                .limit(1);
            if (!branchRow)
                throw new Error('Selected branch does not exist or is inactive.');
        }
        const [created] = await tx
            .insert(schema_1.shiftTemplates)
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
        await tx.insert(schema_1.auditLogs).values({
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
exports.createShiftTemplateTransaction = createShiftTemplateTransaction;
