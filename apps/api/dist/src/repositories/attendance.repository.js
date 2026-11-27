"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchReviewAttendanceTransaction = exports.createManualAdjustmentTransaction = exports.clockOutTransaction = exports.clockInTransaction = exports.findActiveSessionById = exports.getLiveDutyRoster = exports.listAttendanceRecords = void 0;
// apps/api/src/repositories/attendance.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function formatLocalIsoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function parseStartBoundary(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}T00:00:00.000Z`)
        : new Date(dateStr);
}
function parseEndBoundary(dateStr) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}T23:59:59.999Z`)
        : new Date(dateStr);
}
async function getDailyStandardHours(tx, tenantId) {
    const [settings] = await tx
        .select({ standardWorkWeekHours: schema_1.tenantFinancialSettings.standardWorkWeekHours })
        .from(schema_1.tenantFinancialSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
        .limit(1);
    const weekly = settings?.standardWorkWeekHours ?? 40;
    return Math.max(1, Number((weekly / 5).toFixed(2)));
}
async function assertEmployeeBranchClearance(tx, tenantId, employee, targetBranchId) {
    if (employee.role === 'ADMIN' || employee.role === 'SUPER_ADMIN') {
        return;
    }
    const memberships = await tx
        .select({ branchId: schema_1.userBranchMemberships.branchId })
        .from(schema_1.userBranchMemberships)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.userId, employee.id), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true)));
    const allowedIds = memberships.length > 0
        ? memberships.map((m) => m.branchId)
        : employee.defaultBranchId
            ? [employee.defaultBranchId]
            : [];
    if (!allowedIds.includes(targetBranchId)) {
        throw new Error('Branch clearance violation: Employee is not assigned to this outlet. Assign outlet clearance in the Employee Directory first.');
    }
}
const listAttendanceRecords = async (tenantId, filters) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId)];
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0) {
            return [];
        }
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.attendanceRecords.branchId, filters.effectiveBranchIds));
    }
    if (filters.userId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, filters.userId));
    }
    if (filters.status) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, filters.status));
    }
    if (filters.startDate) {
        conditions.push((0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockInAt, parseStartBoundary(filters.startDate)));
    }
    if (filters.endDate) {
        conditions.push((0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockInAt, parseEndBoundary(filters.endDate)));
    }
    return await db_1.db
        .select({
        id: schema_1.attendanceRecords.id,
        userId: schema_1.attendanceRecords.userId,
        employeeName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        employeeRole: schema_1.users.role,
        employeeEmail: schema_1.users.email,
        branchId: schema_1.attendanceRecords.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        scheduleId: schema_1.attendanceRecords.scheduleId,
        scheduledStart: schema_1.workSchedules.startTime,
        scheduledEnd: schema_1.workSchedules.endTime,
        clockInAt: schema_1.attendanceRecords.clockInAt,
        clockOutAt: schema_1.attendanceRecords.clockOutAt,
        clockInMethod: schema_1.attendanceRecords.clockInMethod,
        clockOutMethod: schema_1.attendanceRecords.clockOutMethod,
        breakMinutes: schema_1.attendanceRecords.breakMinutes,
        totalDurationMinutes: schema_1.attendanceRecords.totalDurationMinutes,
        regularHours: schema_1.attendanceRecords.regularHours,
        overtimeHours: schema_1.attendanceRecords.overtimeHours,
        status: schema_1.attendanceRecords.status,
        verificationStatus: schema_1.attendanceRecords.verificationStatus,
        deviceInfo: schema_1.attendanceRecords.deviceInfo,
        notes: schema_1.attendanceRecords.notes,
        approvedAt: schema_1.attendanceRecords.approvedAt,
    })
        .from(schema_1.attendanceRecords)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .leftJoin(schema_1.workSchedules, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.scheduleId, schema_1.workSchedules.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.attendanceRecords.clockInAt))
        .limit(500);
};
exports.listAttendanceRecords = listAttendanceRecords;
const getLiveDutyRoster = async (tenantId, effectiveBranchIds) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY'),
    ];
    if (effectiveBranchIds !== null) {
        if (effectiveBranchIds.length === 0) {
            return [];
        }
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.attendanceRecords.branchId, effectiveBranchIds));
    }
    return await db_1.db
        .select({
        id: schema_1.attendanceRecords.id,
        userId: schema_1.attendanceRecords.userId,
        employeeName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        employeeRole: schema_1.users.role,
        employeeEmail: schema_1.users.email,
        branchId: schema_1.attendanceRecords.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        clockInAt: schema_1.attendanceRecords.clockInAt,
        clockInMethod: schema_1.attendanceRecords.clockInMethod,
        deviceInfo: schema_1.attendanceRecords.deviceInfo,
        verificationStatus: schema_1.attendanceRecords.verificationStatus,
    })
        .from(schema_1.attendanceRecords)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.attendanceRecords.clockInAt));
};
exports.getLiveDutyRoster = getLiveDutyRoster;
const findActiveSessionById = async (tenantId, attendanceId) => {
    const [row] = await db_1.db
        .select({
        id: schema_1.attendanceRecords.id,
        userId: schema_1.attendanceRecords.userId,
        branchId: schema_1.attendanceRecords.branchId,
        status: schema_1.attendanceRecords.status,
    })
        .from(schema_1.attendanceRecords)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, attendanceId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId)))
        .limit(1);
    return row ?? null;
};
exports.findActiveSessionById = findActiveSessionById;
const clockInTransaction = async (tenantId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [[employee], [branchRow]] = await Promise.all([
            tx
                .select({
                id: schema_1.users.id,
                role: schema_1.users.role,
                defaultBranchId: schema_1.users.defaultBranchId,
                pinHash: schema_1.users.pinHash,
                isActive: schema_1.users.isActive,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
                .limit(1),
            tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
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
            const isPinValid = await bcryptjs_1.default.compare(input.pin, employee.pinHash);
            if (!isPinValid) {
                throw new Error('Invalid PIN authentication code.');
            }
        }
        const [activeSession] = await tx
            .select({ id: schema_1.attendanceRecords.id })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY')))
            .limit(1);
        if (activeSession) {
            throw new Error('Employee is already clocked in and active on duty.');
        }
        const now = new Date();
        const todayStr = formatLocalIsoDate(now);
        const [matchingSchedule] = await tx
            .select({
            id: schema_1.workSchedules.id,
            startTime: schema_1.workSchedules.startTime,
        })
            .from(schema_1.workSchedules)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.branchId, input.branchId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.shiftDate, todayStr), (0, drizzle_orm_1.ne)(schema_1.workSchedules.status, 'CANCELLED')))
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
            .insert(schema_1.attendanceRecords)
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
        await tx.insert(schema_1.auditLogs).values({
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
exports.clockInTransaction = clockInTransaction;
const clockOutTransaction = async (tenantId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [session] = await tx
            .select({
            id: schema_1.attendanceRecords.id,
            userId: schema_1.attendanceRecords.userId,
            branchId: schema_1.attendanceRecords.branchId,
            clockInAt: schema_1.attendanceRecords.clockInAt,
            verificationStatus: schema_1.attendanceRecords.verificationStatus,
            pinHash: schema_1.users.pinHash,
        })
            .from(schema_1.attendanceRecords)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, input.attendanceId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY')))
            .limit(1);
        if (!session) {
            throw new Error('Active shift session not found or already clocked out.');
        }
        if (input.method === 'PIN') {
            if (!session.pinHash || !input.pin) {
                throw new Error('Valid PIN is required for clock-out authentication.');
            }
            const isPinValid = await bcryptjs_1.default.compare(input.pin, session.pinHash);
            if (!isPinValid) {
                throw new Error('Invalid PIN authentication code.');
            }
        }
        const dailyStandardHours = await getDailyStandardHours(tx, tenantId);
        const clockOutTime = new Date();
        const rawMinutes = Math.max(0, Math.floor((clockOutTime.getTime() - session.clockInAt.getTime()) / (1000 * 60)));
        const netMinutes = Math.max(0, rawMinutes - input.breakMinutes);
        const netHours = netMinutes / 60;
        const regularHours = Math.min(dailyStandardHours, netHours);
        const overtimeHours = Math.max(0, netHours - dailyStandardHours);
        const [updated] = await tx
            .update(schema_1.attendanceRecords)
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
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, input.attendanceId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
exports.clockOutTransaction = clockOutTransaction;
const createManualAdjustmentTransaction = async (tenantId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const inDate = new Date(input.clockInAt);
        const outDate = new Date(input.clockOutAt);
        if (outDate <= inDate) {
            throw new Error('Clock-out timestamp must be strictly after clock-in.');
        }
        const [[employee], [branchRow]] = await Promise.all([
            tx
                .select({
                id: schema_1.users.id,
                role: schema_1.users.role,
                defaultBranchId: schema_1.users.defaultBranchId,
                isActive: schema_1.users.isActive,
            })
                .from(schema_1.users)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
                .limit(1),
            tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
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
        const isSelfEntry = input.userId === actor.userId && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN';
        const [record] = await tx
            .insert(schema_1.attendanceRecords)
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
        await tx.insert(schema_1.auditLogs).values({
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
exports.createManualAdjustmentTransaction = createManualAdjustmentTransaction;
const batchReviewAttendanceTransaction = async (tenantId, recordIds, effectiveBranchIds, decision, actor, reason) => {
    return await db_1.db.transaction(async (tx) => {
        const conditions = [
            (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId),
            (0, drizzle_orm_1.inArray)(schema_1.attendanceRecords.id, recordIds),
            (0, drizzle_orm_1.inArray)(schema_1.attendanceRecords.status, ['COMPLETED', 'PENDING_REVIEW']),
        ];
        if (effectiveBranchIds !== null) {
            if (effectiveBranchIds.length === 0)
                return { count: 0 };
            conditions.push((0, drizzle_orm_1.inArray)(schema_1.attendanceRecords.branchId, effectiveBranchIds));
        }
        // Maker-checker guard: non-admins cannot self-approve their own timesheets
        if (decision === 'APPROVED' && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
            conditions.push((0, drizzle_orm_1.ne)(schema_1.attendanceRecords.userId, actor.userId));
        }
        const updated = await tx
            .update(schema_1.attendanceRecords)
            .set({
            status: decision,
            approvedByUserId: actor.userId,
            approvedAt: new Date(),
            ...(reason ? { notes: reason } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)(...conditions))
            .returning({ id: schema_1.attendanceRecords.id, branchId: schema_1.attendanceRecords.branchId });
        if (updated.length > 0) {
            await tx.insert(schema_1.auditLogs).values({
                tenantId,
                branchId: updated[0]?.branchId ?? null,
                userId: actor.userId,
                action: decision === 'APPROVED' ? 'ATTENDANCE_BATCH_APPROVED' : 'ATTENDANCE_BATCH_REJECTED',
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
exports.batchReviewAttendanceTransaction = batchReviewAttendanceTransaction;
