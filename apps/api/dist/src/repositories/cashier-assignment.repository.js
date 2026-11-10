"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAssignment = exports.updateAssignment = exports.assignCashier = exports.getAssignmentContext = exports.listCashierAssignments = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listCashierAssignments = async (tenantId, filters) => {
    const supervisorUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
    })
        .from(schema_1.users)
        .as('supervisor_users');
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId),
        filters.branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.branchId, filters.branchId) : undefined,
        filters.userId ? (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, filters.userId) : undefined,
        filters.status && filters.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.status, filters.status) : undefined,
        filters.startDate ? (0, drizzle_orm_1.gte)(schema_1.cashierAssignments.assignmentDate, filters.startDate) : undefined,
        filters.endDate ? (0, drizzle_orm_1.lte)(schema_1.cashierAssignments.assignmentDate, filters.endDate) : undefined,
    ].filter(Boolean);
    const entries = await db_1.db
        .select({
        id: schema_1.cashierAssignments.id,
        branchId: schema_1.cashierAssignments.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        cashDrawerId: schema_1.cashierAssignments.cashDrawerId,
        drawerName: schema_1.cashDrawers.name,
        userId: schema_1.cashierAssignments.userId,
        cashierName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
        cashierEmail: schema_1.users.email,
        cashierRole: schema_1.users.role,
        assignedByUserId: schema_1.cashierAssignments.assignedByUserId,
        supervisorName: (0, drizzle_orm_1.sql) `CONCAT(${supervisorUsers.firstName}, ' ', ${supervisorUsers.lastName})`,
        assignmentDate: schema_1.cashierAssignments.assignmentDate,
        shiftType: schema_1.cashierAssignments.shiftType,
        status: schema_1.cashierAssignments.status,
        allocatedFloat: schema_1.cashierAssignments.allocatedFloat,
        maxCashLimit: schema_1.cashierAssignments.maxCashLimit,
        allowRefunds: schema_1.cashierAssignments.allowRefunds,
        allowDrawerPop: schema_1.cashierAssignments.allowDrawerPop,
        allowManualDiscount: schema_1.cashierAssignments.allowManualDiscount,
        maxDiscountPercent: schema_1.cashierAssignments.maxDiscountPercent,
        activatedAt: schema_1.cashierAssignments.activatedAt,
        closedAt: schema_1.cashierAssignments.closedAt,
        handoverNotes: schema_1.cashierAssignments.handoverNotes,
        createdAt: schema_1.cashierAssignments.createdAt,
    })
        .from(schema_1.cashierAssignments)
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.branchId, schema_1.branches.id))
        .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.cashDrawerId, schema_1.cashDrawers.id))
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, schema_1.users.id))
        .leftJoin(supervisorUsers, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignedByUserId, supervisorUsers.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierAssignments.assignmentDate), (0, drizzle_orm_1.desc)(schema_1.cashierAssignments.id));
    return entries;
};
exports.listCashierAssignments = listCashierAssignments;
const getAssignmentContext = async (tenantId, branchId) => {
    const [activeDrawers, activeStaff] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.cashDrawers.id,
            name: schema_1.cashDrawers.name,
            branchId: schema_1.cashDrawers.branchId,
        })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId) : undefined)),
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
            .orderBy(schema_1.users.firstName),
    ]);
    return {
        drawers: activeDrawers,
        staff: activeStaff,
    };
};
exports.getAssignmentContext = getAssignmentContext;
const assignCashier = async (tenantId, supervisorId, input) => {
    const [existingActiveDrawer] = await db_1.db
        .select({ id: schema_1.cashierAssignments.id })
        .from(schema_1.cashierAssignments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.cashDrawerId, input.cashDrawerId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, input.assignmentDate), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.shiftType, input.shiftType), (0, drizzle_orm_1.sql) `${schema_1.cashierAssignments.status} IN ('ASSIGNED', 'ACTIVE')`))
        .limit(1);
    if (existingActiveDrawer) {
        throw new Error('Register Conflict: This physical cash drawer is already assigned to a custodian for this shift.');
    }
    const [existingCashierShift] = await db_1.db
        .select({ id: schema_1.cashierAssignments.id })
        .from(schema_1.cashierAssignments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, input.assignmentDate), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.shiftType, input.shiftType), (0, drizzle_orm_1.sql) `${schema_1.cashierAssignments.status} IN ('ASSIGNED', 'ACTIVE')`))
        .limit(1);
    if (existingCashierShift) {
        throw new Error('Custodian Overlap: This cashier already holds an active drawer custody assignment for this shift.');
    }
    const [assignment] = await db_1.db
        .insert(schema_1.cashierAssignments)
        .values({
        tenantId,
        branchId: input.branchId,
        cashDrawerId: input.cashDrawerId,
        userId: input.userId,
        assignedByUserId: supervisorId,
        assignmentDate: input.assignmentDate,
        shiftType: input.shiftType,
        status: 'ASSIGNED',
        allocatedFloat: String(input.allocatedFloat),
        maxCashLimit: String(input.maxCashLimit),
        allowRefunds: input.allowRefunds,
        allowDrawerPop: input.allowDrawerPop,
        allowManualDiscount: input.allowManualDiscount,
        maxDiscountPercent: input.maxDiscountPercent,
        handoverNotes: input.handoverNotes || null,
    })
        .returning();
    return assignment;
};
exports.assignCashier = assignCashier;
const updateAssignment = async (tenantId, assignmentId, input) => {
    const [existing] = await db_1.db
        .select()
        .from(schema_1.cashierAssignments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Cashier assignment record not found.');
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.status) {
        updateData.status = input.status;
        if (input.status === 'ACTIVE' && !existing.activatedAt) {
            updateData.activatedAt = new Date();
        }
        if ((input.status === 'RELEASED' || input.status === 'REVOKED') && !existing.closedAt) {
            updateData.closedAt = new Date();
        }
    }
    if (input.allocatedFloat !== undefined)
        updateData.allocatedFloat = String(input.allocatedFloat);
    if (input.maxCashLimit !== undefined)
        updateData.maxCashLimit = String(input.maxCashLimit);
    if (input.allowRefunds !== undefined)
        updateData.allowRefunds = input.allowRefunds;
    if (input.allowDrawerPop !== undefined)
        updateData.allowDrawerPop = input.allowDrawerPop;
    if (input.allowManualDiscount !== undefined)
        updateData.allowManualDiscount = input.allowManualDiscount;
    if (input.maxDiscountPercent !== undefined)
        updateData.maxDiscountPercent = input.maxDiscountPercent;
    if (input.handoverNotes !== undefined)
        updateData.handoverNotes = input.handoverNotes;
    const [updated] = await db_1.db
        .update(schema_1.cashierAssignments)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId))
        .returning();
    return updated;
};
exports.updateAssignment = updateAssignment;
const revokeAssignment = async (tenantId, assignmentId, reason) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.cashierAssignments.id, handoverNotes: schema_1.cashierAssignments.handoverNotes })
        .from(schema_1.cashierAssignments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Cashier assignment record not found.');
    }
    const noteAddition = existing.handoverNotes
        ? `${existing.handoverNotes} | [REVOKED]: ${reason}`
        : `[REVOKED]: ${reason}`;
    const [revoked] = await db_1.db
        .update(schema_1.cashierAssignments)
        .set({
        status: 'REVOKED',
        closedAt: new Date(),
        handoverNotes: noteAddition,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId))
        .returning();
    return revoked;
};
exports.revokeAssignment = revokeAssignment;
