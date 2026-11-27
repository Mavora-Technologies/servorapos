"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAssignmentTransaction = exports.updateAssignmentTransaction = exports.assignCashierTransaction = exports.getAssignmentContext = exports.findAssignmentById = exports.listCashierAssignments = void 0;
// apps/api/src/repositories/cashier-assignment.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
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
        throw new Error('Branch clearance violation: Selected cashier is not assigned to this outlet. Grant outlet clearance in the Employee Directory first.');
    }
}
const listCashierAssignments = async (tenantId, filters) => {
    const supervisorUsers = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
    })
        .from(schema_1.users)
        .as('supervisor_users');
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)];
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0)
            return [];
        conditions.push((0, drizzle_orm_1.inArray)(schema_1.cashierAssignments.branchId, filters.effectiveBranchIds));
    }
    if (filters.userId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, filters.userId));
    if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.status, filters.status));
    if (filters.startDate) {
        conditions.push((0, drizzle_orm_1.gte)(schema_1.cashierAssignments.assignmentDate, filters.startDate));
    }
    if (filters.endDate) {
        conditions.push((0, drizzle_orm_1.lte)(schema_1.cashierAssignments.assignmentDate, filters.endDate));
    }
    return await db_1.db
        .select({
        id: schema_1.cashierAssignments.id,
        branchId: schema_1.cashierAssignments.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        cashDrawerId: schema_1.cashierAssignments.cashDrawerId,
        drawerName: schema_1.cashDrawers.name,
        drawerCode: schema_1.cashDrawers.drawerCode,
        drawerStatus: schema_1.cashDrawers.status,
        userId: schema_1.cashierAssignments.userId,
        cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        cashierEmail: schema_1.users.email,
        cashierRole: schema_1.users.role,
        assignedByUserId: schema_1.cashierAssignments.assignedByUserId,
        supervisorName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${supervisorUsers.firstName}, ' ', ${supervisorUsers.lastName})), '')`,
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
        .innerJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.cashDrawerId, schema_1.cashDrawers.id), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
        .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .leftJoin(supervisorUsers, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignedByUserId, supervisorUsers.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierAssignments.assignmentDate), (0, drizzle_orm_1.desc)(schema_1.cashierAssignments.id))
        .limit(250);
};
exports.listCashierAssignments = listCashierAssignments;
const findAssignmentById = async (tenantId, assignmentId) => {
    const [row] = await db_1.db
        .select()
        .from(schema_1.cashierAssignments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
        .limit(1);
    return row ?? null;
};
exports.findAssignmentById = findAssignmentById;
const getAssignmentContext = async (tenantId, authorizedBranchIds, effectiveBranchIds) => {
    const branchConditions = [(0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)];
    if (authorizedBranchIds !== null) {
        if (authorizedBranchIds.length === 0)
            branchConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        else
            branchConditions.push((0, drizzle_orm_1.inArray)(schema_1.branches.id, authorizedBranchIds));
    }
    const drawerConditions = [(0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)];
    if (effectiveBranchIds !== null) {
        if (effectiveBranchIds.length === 0) {
            drawerConditions.push((0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId));
        }
        else {
            const drawerScope = (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.cashDrawers.branchId, effectiveBranchIds), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId));
            if (drawerScope)
                drawerConditions.push(drawerScope);
        }
    }
    const staffConditions = [(0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)];
    if (effectiveBranchIds !== null) {
        if (effectiveBranchIds.length === 0) {
            staffConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        }
        else {
            const memberSubquery = db_1.db
                .select({ userId: schema_1.userBranchMemberships.userId })
                .from(schema_1.userBranchMemberships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.userBranchMemberships.branchId, effectiveBranchIds)));
            const staffScope = (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.role, ['ADMIN', 'SUPER_ADMIN']), (0, drizzle_orm_1.inArray)(schema_1.users.defaultBranchId, effectiveBranchIds), (0, drizzle_orm_1.inArray)(schema_1.users.id, memberSubquery));
            if (staffScope)
                staffConditions.push(staffScope);
        }
    }
    const [branchList, activeDrawers, activeStaff, activeMemberships, [finSettings]] = await Promise.all([
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
            .select({
            id: schema_1.cashDrawers.id,
            drawerCode: schema_1.cashDrawers.drawerCode,
            name: schema_1.cashDrawers.name,
            branchId: schema_1.cashDrawers.branchId,
            status: schema_1.cashDrawers.status,
        })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)(...drawerConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.cashDrawers.drawerCode)),
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
            baseCurrency: schema_1.tenantFinancialSettings.baseCurrency,
            maxDrawerCashThreshold: schema_1.tenantFinancialSettings.maxDrawerCashThreshold,
        })
            .from(schema_1.tenantFinancialSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
            .limit(1),
    ]);
    const membershipMap = new Map();
    for (const m of activeMemberships) {
        const arr = membershipMap.get(m.userId) ?? [];
        arr.push(m.branchId);
        membershipMap.set(m.userId, arr);
    }
    const allBranchIds = branchList.map((b) => b.id);
    return {
        branches: branchList,
        drawers: activeDrawers,
        staff: activeStaff.map((s) => {
            const mems = membershipMap.get(s.id) ?? [];
            const assignedBranchIds = s.role === 'ADMIN' || s.role === 'SUPER_ADMIN'
                ? allBranchIds
                : mems.length > 0
                    ? mems
                    : s.defaultBranchId
                        ? [s.defaultBranchId]
                        : [];
            return { ...s, assignedBranchIds };
        }),
        treasuryPolicy: {
            currency: finSettings?.baseCurrency ?? 'KES',
            maxDrawerCashThreshold: parseFloat(finSettings?.maxDrawerCashThreshold ?? '50000.00') || 50000,
        },
    };
};
exports.getAssignmentContext = getAssignmentContext;
const assignCashierTransaction = async (tenantId, supervisorId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [[branchRow], [drawerRow], [cashierRow]] = await Promise.all([
            tx
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true)))
                .limit(1),
            tx
                .select({ id: schema_1.cashDrawers.id, branchId: schema_1.cashDrawers.branchId, name: schema_1.cashDrawers.name })
                .from(schema_1.cashDrawers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, input.cashDrawerId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, input.branchId), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))))
                .limit(1),
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
        ]);
        if (!branchRow)
            throw new Error('Selected branch does not exist or is inactive.');
        if (!drawerRow) {
            throw new Error('Selected cash drawer does not belong to the chosen operating branch.');
        }
        if (!cashierRow || !cashierRow.isActive) {
            throw new Error('Selected cashier account is inactive or not found.');
        }
        await assertEmployeeBranchClearance(tx, tenantId, cashierRow, input.branchId);
        const [existingActiveDrawer] = await tx
            .select({ id: schema_1.cashierAssignments.id })
            .from(schema_1.cashierAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.cashDrawerId, input.cashDrawerId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, input.assignmentDate), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.shiftType, input.shiftType), (0, drizzle_orm_1.inArray)(schema_1.cashierAssignments.status, ['ASSIGNED', 'ACTIVE'])))
            .limit(1);
        if (existingActiveDrawer) {
            throw new Error(`Register Conflict: "${drawerRow.name}" is already assigned to a custodian for this shift.`);
        }
        const [existingCashierShift] = await tx
            .select({ id: schema_1.cashierAssignments.id })
            .from(schema_1.cashierAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, input.userId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, input.assignmentDate), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.shiftType, input.shiftType), (0, drizzle_orm_1.inArray)(schema_1.cashierAssignments.status, ['ASSIGNED', 'ACTIVE'])))
            .limit(1);
        if (existingCashierShift) {
            throw new Error('Custodian Overlap: This cashier already holds an active drawer custody assignment for this shift.');
        }
        const [assignment] = await tx
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
            allocatedFloat: input.allocatedFloat.toFixed(2),
            maxCashLimit: input.maxCashLimit.toFixed(2),
            allowRefunds: input.allowRefunds,
            allowDrawerPop: input.allowDrawerPop,
            allowManualDiscount: input.allowManualDiscount,
            maxDiscountPercent: input.allowManualDiscount ? input.maxDiscountPercent : 0,
            handoverNotes: input.handoverNotes ?? null,
        })
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: assignment.branchId,
            userId: actor.userId,
            action: 'CASHIER_CUSTODY_ASSIGNED',
            module: 'WORKFORCE_HCM',
            entityType: 'cashier_assignments',
            entityId: String(assignment.id),
            newValues: {
                cashierId: assignment.userId,
                cashDrawerId: assignment.cashDrawerId,
                shiftType: assignment.shiftType,
                allocatedFloat: assignment.allocatedFloat,
                allowRefunds: assignment.allowRefunds,
            },
            ipAddress: actor.ipAddress ?? null,
        });
        return assignment;
    });
};
exports.assignCashierTransaction = assignCashierTransaction;
const updateAssignmentTransaction = async (tenantId, assignmentId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.cashierAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status === 'REVOKED') {
            throw new Error('Revoked custody assignments cannot be modified.');
        }
        // 1. Activating custody syncs live POS shift + cash drawer session
        if (input.status === 'ACTIVE' && existing.status === 'ASSIGNED') {
            const [drawer] = await tx
                .select()
                .from(schema_1.cashDrawers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, existing.cashDrawerId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
                .limit(1);
            if (!drawer)
                throw new Error('Linked physical cash drawer no longer exists.');
            if (drawer.status === 'OPEN') {
                throw new Error(`Cash drawer "${drawer.name}" is already OPEN under another active shift. Close it first.`);
            }
            const [existingOpenShift] = await tx
                .select({ id: schema_1.cashierShifts.id })
                .from(schema_1.cashierShifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, existing.userId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')))
                .limit(1);
            const floatNum = input.allocatedFloat !== undefined
                ? input.allocatedFloat
                : parseFloat(existing.allocatedFloat) || 0;
            if (!existingOpenShift) {
                await tx.insert(schema_1.cashierShifts).values({
                    tenantId,
                    branchId: existing.branchId,
                    cashierId: existing.userId,
                    openingFloat: floatNum.toFixed(2),
                    expectedCash: floatNum.toFixed(2),
                    status: 'OPEN',
                    varianceNotes: `[${existing.shiftType}] Activated via Cashier Custody #${existing.id}`,
                });
            }
            await tx.insert(schema_1.drawerSessions).values({
                tenantId,
                drawerId: drawer.id,
                cashierId: existing.userId,
                supervisorId: actor.userId !== existing.userId ? actor.userId : null,
                status: 'ACTIVE',
                openingFloat: floatNum.toFixed(4),
                expectedClosingBalance: floatNum.toFixed(4),
                notes: existing.handoverNotes || `Activated from Custody Assignment #${existing.id}`,
            });
            await tx
                .update(schema_1.cashDrawers)
                .set({
                status: 'OPEN',
                currentBalance: floatNum.toFixed(2),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, drawer.id));
        }
        // 2. Fiduciary guard on RELEASED: prevent releasing custody while an OPEN shift hasn't been counted/closed
        if (input.status === 'RELEASED' && existing.status === 'ACTIVE') {
            const [openShift] = await tx
                .select({ id: schema_1.cashierShifts.id })
                .from(schema_1.cashierShifts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, existing.userId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')))
                .limit(1);
            if (openShift) {
                throw new Error(`Cannot release custody while Cashier Shift #${openShift.id} is still OPEN. Reconcile and close the till under Cash Management → Cashier Till first.`);
            }
        }
        const updateSet = {
            updatedAt: new Date(),
        };
        if (input.status) {
            updateSet.status = input.status;
            if (input.status === 'ACTIVE' && !existing.activatedAt) {
                updateSet.activatedAt = new Date();
            }
            if ((input.status === 'RELEASED' || input.status === 'REVOKED') && !existing.closedAt) {
                updateSet.closedAt = new Date();
            }
        }
        if (input.allocatedFloat !== undefined) {
            updateSet.allocatedFloat = input.allocatedFloat.toFixed(2);
        }
        if (input.maxCashLimit !== undefined) {
            updateSet.maxCashLimit = input.maxCashLimit.toFixed(2);
        }
        if (input.allowRefunds !== undefined)
            updateSet.allowRefunds = input.allowRefunds;
        if (input.allowDrawerPop !== undefined)
            updateSet.allowDrawerPop = input.allowDrawerPop;
        if (input.allowManualDiscount !== undefined) {
            updateSet.allowManualDiscount = input.allowManualDiscount;
        }
        if (input.maxDiscountPercent !== undefined) {
            updateSet.maxDiscountPercent = input.maxDiscountPercent;
        }
        if (input.handoverNotes !== undefined)
            updateSet.handoverNotes = input.handoverNotes;
        const [updated] = await tx
            .update(schema_1.cashierAssignments)
            .set(updateSet)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
            .returning();
        const action = input.status === 'ACTIVE'
            ? 'CASHIER_CUSTODY_ACTIVATED'
            : input.status === 'RELEASED'
                ? 'CASHIER_CUSTODY_RELEASED'
                : 'CASHIER_CUSTODY_UPDATED';
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updated.branchId,
            userId: actor.userId,
            action,
            module: 'WORKFORCE_HCM',
            entityType: 'cashier_assignments',
            entityId: String(updated.id),
            previousValues: { status: existing.status, allocatedFloat: existing.allocatedFloat },
            newValues: { status: updated.status, allocatedFloat: updated.allocatedFloat },
            ipAddress: actor.ipAddress ?? null,
        });
        return updated;
    });
};
exports.updateAssignmentTransaction = updateAssignmentTransaction;
const revokeAssignmentTransaction = async (tenantId, assignmentId, reason, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.cashierAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status === 'REVOKED' || existing.status === 'RELEASED') {
            throw new Error('This custody assignment is already closed.');
        }
        const noteAddition = existing.handoverNotes
            ? `${existing.handoverNotes} | [REVOKED]: ${reason}`
            : `[REVOKED]: ${reason}`;
        const [revoked] = await tx
            .update(schema_1.cashierAssignments)
            .set({
            status: 'REVOKED',
            closedAt: new Date(),
            handoverNotes: noteAddition,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.id, assignmentId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: revoked.branchId,
            userId: actor.userId,
            action: 'CASHIER_CUSTODY_REVOKED',
            module: 'WORKFORCE_HCM',
            entityType: 'cashier_assignments',
            entityId: String(revoked.id),
            reason,
            previousValues: { status: existing.status },
            newValues: { status: 'REVOKED' },
            ipAddress: actor.ipAddress ?? null,
        });
        await tx.insert(schema_1.notifications).values({
            tenantId,
            branchId: revoked.branchId,
            title: `Emergency Cash Drawer Custody Revoked (#${revoked.id})`,
            detail: `Cashier custody for drawer #${revoked.cashDrawerId} was revoked. Reason: ${reason}. Perform an immediate blind till count under Cashier Shifts.`,
            severity: 'CRITICAL',
            module: 'FINANCE',
            category: 'COMPLIANCE_AUDIT',
            entityType: 'cashier_assignments',
            entityId: String(revoked.id),
            actionUrl: '/cash-management/shifts',
            isRead: false,
            isResolved: false,
        });
        return revoked;
    });
};
exports.revokeAssignmentTransaction = revokeAssignmentTransaction;
