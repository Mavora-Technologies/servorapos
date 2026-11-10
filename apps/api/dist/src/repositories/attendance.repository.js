"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchApproveAttendance = exports.createManualAdjustment = exports.clockOut = exports.clockIn = exports.getLiveDutyRoster = exports.listAttendanceRecords = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listAttendanceRecords = async (tenantId, filters) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId),
        filters.branchId ? (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, filters.branchId) : undefined,
        filters.userId ? (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, filters.userId) : undefined,
        filters.status && filters.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, filters.status) : undefined,
        filters.startDate ? (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockInAt, new Date(filters.startDate)) : undefined,
        filters.endDate ? (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockInAt, new Date(filters.endDate)) : undefined,
    ].filter(Boolean);
    const records = await db_1.db
        .select({
        id: schema_1.attendanceRecords.id,
        userId: schema_1.attendanceRecords.userId,
        employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
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
        notes: schema_1.attendanceRecords.notes,
        approvedAt: schema_1.attendanceRecords.approvedAt,
    })
        .from(schema_1.attendanceRecords)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id))
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, schema_1.branches.id))
        .leftJoin(schema_1.workSchedules, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.scheduleId, schema_1.workSchedules.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.attendanceRecords.clockInAt));
    return records;
};
exports.listAttendanceRecords = listAttendanceRecords;
const getLiveDutyRoster = async (tenantId, branchId) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY'),
        branchId ? (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, branchId) : undefined,
    ].filter(Boolean);
    return await db_1.db
        .select({
        id: schema_1.attendanceRecords.id,
        userId: schema_1.attendanceRecords.userId,
        employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
        employeeRole: schema_1.users.role,
        employeeEmail: schema_1.users.email,
        branchId: schema_1.attendanceRecords.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        clockInAt: schema_1.attendanceRecords.clockInAt,
        clockInMethod: schema_1.attendanceRecords.clockInMethod,
        deviceInfo: schema_1.attendanceRecords.deviceInfo,
    })
        .from(schema_1.attendanceRecords)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id))
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.attendanceRecords.clockInAt));
};
exports.getLiveDutyRoster = getLiveDutyRoster;
const clockIn = async (tenantId, input) => {
    const [employee] = await db_1.db
        .select({ id: schema_1.users.id, pinHash: schema_1.users.pinHash, isActive: schema_1.users.isActive })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .limit(1);
    if (!employee || !employee.isActive) {
        throw new Error('Employee account is inactive or not found.');
    }
    if (input.method === 'PIN') {
        if (!employee.pinHash || !input.pin) {
            throw new Error('Valid POS Fast-Login PIN is required for PIN clock-in.');
        }
        const isPinValid = await bcryptjs_1.default.compare(input.pin, employee.pinHash);
        if (!isPinValid) {
            throw new Error('Invalid PIN authentication code.');
        }
    }
    // Prevent multiple open clock-in sessions
    const [activeSession] = await db_1.db
        .select({ id: schema_1.attendanceRecords.id })
        .from(schema_1.attendanceRecords)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.status, 'ON_DUTY')))
        .limit(1);
    if (activeSession) {
        throw new Error('Employee is already clocked in and active on duty.');
    }
    // Correlate with published work schedule for today to detect punctuality
    const todayStr = new Date().toISOString().split('T')[0];
    const [matchingSchedule] = await db_1.db
        .select({ id: schema_1.workSchedules.id, startTime: schema_1.workSchedules.startTime })
        .from(schema_1.workSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.workSchedules.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.workSchedules.shiftDate, todayStr), (0, drizzle_orm_1.sql) `${schema_1.workSchedules.status} != 'CANCELLED'`))
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
    const [record] = await db_1.db
        .insert(schema_1.attendanceRecords)
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
exports.clockIn = clockIn;
const clockOut = async (tenantId, input) => {
    const [session] = await db_1.db
        .select({
        id: schema_1.attendanceRecords.id,
        userId: schema_1.attendanceRecords.userId,
        clockInAt: schema_1.attendanceRecords.clockInAt,
        pinHash: schema_1.users.pinHash,
    })
        .from(schema_1.attendanceRecords)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.attendanceRecords.userId, schema_1.users.id))
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
    const clockOutTime = new Date();
    const rawDiffMs = clockOutTime.getTime() - session.clockInAt.getTime();
    const rawMinutes = Math.max(0, Math.floor(rawDiffMs / (1000 * 60)));
    const netMinutes = Math.max(0, rawMinutes - input.breakMinutes);
    const netHours = netMinutes / 60;
    const regularHours = Math.min(8, netHours);
    const overtimeHours = Math.max(0, netHours - 8);
    const [updated] = await db_1.db
        .update(schema_1.attendanceRecords)
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
        .where((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.id, input.attendanceId))
        .returning();
    return updated;
};
exports.clockOut = clockOut;
const createManualAdjustment = async (tenantId, managerUserId, input) => {
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
    const [record] = await db_1.db
        .insert(schema_1.attendanceRecords)
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
exports.createManualAdjustment = createManualAdjustment;
const batchApproveAttendance = async (tenantId, managerUserId, recordIds) => {
    const updated = await db_1.db
        .update(schema_1.attendanceRecords)
        .set({
        status: 'APPROVED',
        approvedByUserId: managerUserId,
        approvedAt: new Date(),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.attendanceRecords.id, recordIds), (0, drizzle_orm_1.sql) `${schema_1.attendanceRecords.status} IN ('COMPLETED', 'PENDING_REVIEW')`))
        .returning({ id: schema_1.attendanceRecords.id });
    return { approvedCount: updated.length };
};
exports.batchApproveAttendance = batchApproveAttendance;
