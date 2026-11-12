"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeCashShiftRecord = exports.recordShiftCashMovement = exports.openCashShiftRecord = exports.getActiveShiftForCashier = exports.listTenantCashShifts = exports.getCashShiftMetrics = exports.getShiftCockpitSetup = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getShiftCockpitSetup = async (tenantId, branchId) => {
    const drawerBranchFilter = branchId
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))
        : undefined;
    const todayStr = new Date().toISOString().split('T')[0];
    const [staffList, branchDrawers, todayAssignments] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.users.id,
            fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            email: schema_1.users.email,
            role: schema_1.users.role,
            defaultBranchId: schema_1.users.defaultBranchId,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName)),
        db_1.db
            .select({
            id: schema_1.cashDrawers.id,
            drawerCode: schema_1.cashDrawers.drawerCode,
            name: schema_1.cashDrawers.name,
            status: schema_1.cashDrawers.status,
            currentBalance: schema_1.cashDrawers.currentBalance,
            branchId: schema_1.cashDrawers.branchId,
        })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), drawerBranchFilter))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.cashDrawers.drawerCode)),
        db_1.db
            .select({
            id: schema_1.cashierAssignments.id,
            userId: schema_1.cashierAssignments.userId,
            cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            cashDrawerId: schema_1.cashierAssignments.cashDrawerId,
            drawerName: schema_1.cashDrawers.name,
            drawerCode: schema_1.cashDrawers.drawerCode,
            shiftType: schema_1.cashierAssignments.shiftType,
            allocatedFloat: schema_1.cashierAssignments.allocatedFloat,
            maxCashLimit: schema_1.cashierAssignments.maxCashLimit,
            status: schema_1.cashierAssignments.status,
        })
            .from(schema_1.cashierAssignments)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, schema_1.users.id))
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.cashDrawerId, schema_1.cashDrawers.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, todayStr), branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.branchId, branchId) : undefined)),
    ]);
    return {
        staff: staffList,
        drawers: branchDrawers.map((d) => ({
            ...d,
            currentBalance: Number(d.currentBalance),
        })),
        todayAssignments: todayAssignments.map((a) => ({
            ...a,
            allocatedFloat: Number(a.allocatedFloat),
            maxCashLimit: Number(a.maxCashLimit),
        })),
    };
};
exports.getShiftCockpitSetup = getShiftCockpitSetup;
const getCashShiftMetrics = async (tenantId, branchId) => {
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, branchId) : undefined;
    const [metrics] = await db_1.db
        .select({
        totalShifts: (0, drizzle_orm_1.sql) `count(*)::int`,
        activeOpenShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'OPEN' then 1 end)::int`,
        totalCashVolume: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.cashierShifts.status} = 'CLOSED' then coalesce(${schema_1.cashierShifts.countedCash}, 0) else 0 end), 0)::numeric`,
        totalNetVariance: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.cashierShifts.status} = 'CLOSED' then coalesce(${schema_1.cashierShifts.variance}, 0) else 0 end), 0)::numeric`,
        discrepancyCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'CLOSED' and abs(coalesce(${schema_1.cashierShifts.variance}, 0)) > 50 then 1 end)::int`,
    })
        .from(schema_1.cashierShifts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), branchCondition));
    return {
        totalShifts: Number(metrics?.totalShifts || 0),
        activeOpenShifts: Number(metrics?.activeOpenShifts || 0),
        totalCashVolumeKes: Number(metrics?.totalCashVolume || 0),
        totalNetVarianceKes: Number(metrics?.totalNetVariance || 0),
        discrepancyCount: Number(metrics?.discrepancyCount || 0),
    };
};
exports.getCashShiftMetrics = getCashShiftMetrics;
// Shared helper to compute live POS cash sales & drawer deductions for an active shift
async function computeLiveShiftFinancials(tenantId, shift) {
    const openingFloat = Number(shift.openingFloat) || 0;
    if (shift.status !== 'OPEN') {
        const finalExpected = Number(shift.expectedCash) || 0;
        return {
            openingFloat,
            posSalesDoneSoFar: Math.max(0, finalExpected - openingFloat),
            safeDropsTotal: 0,
            payoutsTotal: 0,
            liveExpectedCash: finalExpected,
            linkedSession: null,
        };
    }
    const scopeFilter = (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.orders.cashierId, shift.cashierId), (0, drizzle_orm_1.eq)(schema_1.orders.waiterId, shift.cashierId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(schema_1.orders.cashierId), shift.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, shift.branchId) : (0, drizzle_orm_1.sql) `true`));
    const [[orderSalesAgg], [paymentSalesAgg], [linkedSession]] = await Promise.all([
        db_1.db
            .select({
            totalFromOrders: (0, drizzle_orm_1.sql) `coalesce(sum(
          case 
            when coalesce(${schema_1.orders.amountPaid}, 0) > 0 then ${schema_1.orders.amountPaid}
            else coalesce(${schema_1.orders.total}, 0)
          end
        ), 0)::numeric`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.status}) != 'CANCELLED'`, (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) != 'REFUNDED'`, (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, shift.openedAt), scopeFilter)),
        db_1.db
            .select({
            totalFromPayments: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.payments.amount}), 0)::numeric`,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.paymentFlow, 'INBOUND_AR'), (0, drizzle_orm_1.eq)(schema_1.payments.paymentMethod, 'CASH_DRAWER'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false), (0, drizzle_orm_1.eq)(schema_1.payments.processedById, shift.cashierId), (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, shift.openedAt))),
        db_1.db
            .select({
            id: schema_1.drawerSessions.id,
            drawerId: schema_1.drawerSessions.drawerId,
            drawerName: schema_1.cashDrawers.name,
            drawerCode: schema_1.cashDrawers.drawerCode,
            cashSalesTotal: schema_1.drawerSessions.cashSalesTotal,
            cashDropsTotal: schema_1.drawerSessions.cashDropsTotal,
            payoutsTotal: schema_1.drawerSessions.payoutsTotal,
        })
            .from(schema_1.drawerSessions)
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.cashierId, shift.cashierId), (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt))
            .limit(1),
    ]);
    const fromOrders = Number(orderSalesAgg?.totalFromOrders || 0);
    const fromPayments = Number(paymentSalesAgg?.totalFromPayments || 0);
    const fromSession = Number(linkedSession?.cashSalesTotal || 0);
    const posSalesDoneSoFar = Math.max(fromOrders, fromPayments, fromSession);
    const safeDropsTotal = Number(linkedSession?.cashDropsTotal || 0);
    const payoutsTotal = Number(linkedSession?.payoutsTotal || 0);
    const liveExpectedCash = Math.max(0, openingFloat + posSalesDoneSoFar - safeDropsTotal - payoutsTotal);
    return {
        openingFloat,
        posSalesDoneSoFar,
        safeDropsTotal,
        payoutsTotal,
        liveExpectedCash,
        linkedSession: linkedSession
            ? {
                id: linkedSession.id,
                drawerId: linkedSession.drawerId,
                drawerName: linkedSession.drawerName,
                drawerCode: linkedSession.drawerCode,
            }
            : null,
    };
}
const listTenantCashShifts = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, query.branchId) : undefined,
        query.cashierId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, query.cashierId) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, query.status) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.users.firstName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.lastName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.email, `%${query.search}%`))
            : undefined,
        query.startDate ? (0, drizzle_orm_1.gte)(schema_1.cashierShifts.openedAt, new Date(query.startDate)) : undefined,
        query.endDate ? (0, drizzle_orm_1.lte)(schema_1.cashierShifts.openedAt, new Date(query.endDate)) : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.cashierShifts)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.cashierShifts.id,
            branchId: schema_1.cashierShifts.branchId,
            branchName: schema_1.branches.name,
            cashierId: schema_1.cashierShifts.cashierId,
            cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            cashierEmail: schema_1.users.email,
            cashierRole: schema_1.users.role,
            openingFloat: schema_1.cashierShifts.openingFloat,
            expectedCash: schema_1.cashierShifts.expectedCash,
            countedCash: schema_1.cashierShifts.countedCash,
            variance: schema_1.cashierShifts.variance,
            status: schema_1.cashierShifts.status,
            varianceNotes: schema_1.cashierShifts.varianceNotes,
            openedAt: schema_1.cashierShifts.openedAt,
            closedAt: schema_1.cashierShifts.closedAt,
            closedByName: (0, drizzle_orm_1.sql) `(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM users u WHERE u.id = ${schema_1.cashierShifts.closedByUserId})`,
        })
            .from(schema_1.cashierShifts)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierShifts.openedAt))
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count || 0);
    const enrichedShifts = await Promise.all(rows.map(async (r) => {
        const fin = await computeLiveShiftFinancials(tenantId, r);
        return {
            ...r,
            openingFloat: fin.openingFloat,
            posSalesDoneSoFar: fin.posSalesDoneSoFar,
            safeDropsTotal: fin.safeDropsTotal,
            expectedCash: fin.liveExpectedCash,
            countedCash: r.countedCash !== null ? Number(r.countedCash) : null,
            variance: r.variance !== null ? Number(r.variance) : null,
        };
    }));
    return {
        shifts: enrichedShifts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listTenantCashShifts = listTenantCashShifts;
const getActiveShiftForCashier = async (tenantId, cashierId) => {
    const [active] = await db_1.db
        .select({
        id: schema_1.cashierShifts.id,
        branchId: schema_1.cashierShifts.branchId,
        branchName: schema_1.branches.name,
        cashierId: schema_1.cashierShifts.cashierId,
        openingFloat: schema_1.cashierShifts.openingFloat,
        expectedCash: schema_1.cashierShifts.expectedCash,
        status: schema_1.cashierShifts.status,
        openedAt: schema_1.cashierShifts.openedAt,
    })
        .from(schema_1.cashierShifts)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, cashierId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')))
        .limit(1);
    if (!active)
        return null;
    const fin = await computeLiveShiftFinancials(tenantId, active);
    return {
        ...active,
        openingFloat: fin.openingFloat,
        inboundCashSales: fin.posSalesDoneSoFar,
        safeDropsTotal: fin.safeDropsTotal,
        payoutsTotal: fin.payoutsTotal,
        liveExpectedCash: fin.liveExpectedCash,
        drawerSession: fin.linkedSession,
    };
};
exports.getActiveShiftForCashier = getActiveShiftForCashier;
const openCashShiftRecord = async (tenantId, authenticatedUserId, input) => {
    const targetCashierId = input.cashierId || authenticatedUserId;
    return await db_1.db.transaction(async (tx) => {
        const [existingOpen] = await tx
            .select({ id: schema_1.cashierShifts.id })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, targetCashierId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')))
            .limit(1);
        if (existingOpen) {
            throw new Error(`Shift #${existingOpen.id} is already open for this staff member. Close the active shift before opening another.`);
        }
        if (input.cashDrawerId) {
            const [drawer] = await tx
                .select()
                .from(schema_1.cashDrawers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, input.cashDrawerId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
                .limit(1);
            if (!drawer)
                throw new Error('Selected cash drawer register not found');
            if (drawer.status === 'OPEN') {
                throw new Error(`Cash drawer "${drawer.name}" is already locked to another active shift.`);
            }
        }
        const [shift] = await tx
            .insert(schema_1.cashierShifts)
            .values({
            tenantId,
            branchId: input.branchId,
            cashierId: targetCashierId,
            openingFloat: input.openingFloat.toFixed(2),
            expectedCash: input.openingFloat.toFixed(2),
            varianceNotes: input.notes
                ? `[${input.shiftType}] ${input.notes}`
                : `[${input.shiftType}] Shift initialized`,
            status: 'OPEN',
        })
            .returning();
        if (input.cashDrawerId) {
            await tx.insert(schema_1.drawerSessions).values({
                tenantId,
                drawerId: input.cashDrawerId,
                cashierId: targetCashierId,
                supervisorId: authenticatedUserId !== targetCashierId ? authenticatedUserId : null,
                openingFloat: input.openingFloat.toFixed(4),
                expectedClosingBalance: input.openingFloat.toFixed(4),
                status: 'ACTIVE',
                notes: input.notes || `${input.shiftType} shift float initialized`,
            });
            await tx
                .update(schema_1.cashDrawers)
                .set({
                status: 'OPEN',
                currentBalance: input.openingFloat.toFixed(2),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, input.cashDrawerId));
        }
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: input.branchId,
            userId: authenticatedUserId,
            action: 'CASHIER_SHIFT_OPENED',
            module: 'FINANCE',
            entityType: 'cashier_shifts',
            entityId: String(shift.id),
            reason: `${input.shiftType} shift opened with float KES ${input.openingFloat.toLocaleString()}`,
            newValues: {
                shiftId: shift.id,
                cashierId: targetCashierId,
                cashDrawerId: input.cashDrawerId || null,
                openingFloat: input.openingFloat,
            },
        });
        return shift;
    });
};
exports.openCashShiftRecord = openCashShiftRecord;
const recordShiftCashMovement = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [shift] = await tx
            .select()
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, input.shiftId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId)))
            .limit(1);
        if (!shift)
            throw new Error('Cashier shift not found');
        if (shift.status !== 'OPEN')
            throw new Error('Cannot record cash movements on a closed shift');
        const [session] = await tx
            .select()
            .from(schema_1.drawerSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.cashierId, shift.cashierId), (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt))
            .limit(1);
        if (session) {
            const currentDrops = Number(session.cashDropsTotal || 0);
            const currentPayouts = Number(session.payoutsTotal || 0);
            const currentExpected = Number(session.expectedClosingBalance || 0);
            const newDrops = input.movementType === 'SAFE_DROP' ? currentDrops + input.amount : currentDrops;
            const newPayouts = input.movementType === 'PETTY_CASH_PAYOUT' ? currentPayouts + input.amount : currentPayouts;
            const newExpected = Math.max(0, currentExpected - input.amount);
            await tx
                .update(schema_1.drawerSessions)
                .set({
                cashDropsTotal: newDrops.toFixed(4),
                payoutsTotal: newPayouts.toFixed(4),
                expectedClosingBalance: newExpected.toFixed(4),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, session.id));
            await tx
                .update(schema_1.cashDrawers)
                .set({
                currentBalance: newExpected.toFixed(2),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, session.drawerId));
        }
        const currentShiftExpected = Number(shift.expectedCash || 0);
        const updatedShiftExpected = Math.max(0, currentShiftExpected - input.amount);
        const [updatedShift] = await tx
            .update(schema_1.cashierShifts)
            .set({ expectedCash: updatedShiftExpected.toFixed(2) })
            .where((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, shift.id))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: shift.branchId,
            userId,
            action: input.movementType === 'SAFE_DROP' ? 'SHIFT_SAFE_DROP' : 'SHIFT_PETTY_PAYOUT',
            module: 'FINANCE',
            entityType: 'cashier_shifts',
            entityId: String(shift.id),
            reason: input.reason,
            newValues: { amount: input.amount, movementType: input.movementType },
        });
        return updatedShift;
    });
};
exports.recordShiftCashMovement = recordShiftCashMovement;
const closeCashShiftRecord = async (tenantId, supervisorId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [shift] = await tx
            .select()
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, input.shiftId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId)))
            .limit(1);
        if (!shift)
            throw new Error('Cashier shift not found');
        if (shift.status === 'CLOSED')
            throw new Error('Shift is already reconciled and closed');
        const fin = await computeLiveShiftFinancials(tenantId, shift);
        const expectedCash = fin.liveExpectedCash;
        const countedCash = input.countedCash;
        const variance = Math.round((countedCash - expectedCash) * 100) / 100;
        const [closed] = await tx
            .update(schema_1.cashierShifts)
            .set({
            expectedCash: expectedCash.toFixed(2),
            countedCash: countedCash.toFixed(2),
            variance: variance.toFixed(2),
            status: 'CLOSED',
            closedByUserId: supervisorId,
            varianceNotes: input.varianceNotes || (variance === 0 ? 'Balanced shift settlement' : null),
            closedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, shift.id))
            .returning();
        if (fin.linkedSession) {
            await tx
                .update(schema_1.drawerSessions)
                .set({
                status: 'CLOSED_RECONCILED',
                cashSalesTotal: fin.posSalesDoneSoFar.toFixed(4),
                expectedClosingBalance: expectedCash.toFixed(4),
                actualClosingBalance: countedCash.toFixed(4),
                variance: variance.toFixed(4),
                denominations: input.denominations || {},
                supervisorId,
                closedAt: new Date(),
                notes: input.varianceNotes || 'Shift closed and reconciled',
            })
                .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, fin.linkedSession.id));
            await tx
                .update(schema_1.cashDrawers)
                .set({
                status: 'CLOSED',
                currentBalance: '0.00',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, fin.linkedSession.drawerId));
        }
        if (Math.abs(variance) >= 500) {
            await tx.insert(schema_1.notifications).values({
                tenantId,
                branchId: shift.branchId,
                title: `Cash Shift Discrepancy Escalation: Shift #${shift.id}`,
                detail: `Cashier registered a variance of KES ${variance.toLocaleString()} (Expected KES ${expectedCash.toLocaleString()}, Counted KES ${countedCash.toLocaleString()}). Requires supervisor audit.`,
                severity: 'CRITICAL',
                module: 'FINANCE',
                category: 'ACTION_REQUIRED',
                entityType: 'cashier_shifts',
                entityId: String(shift.id),
                actionUrl: '/cash-management/reconciliation',
                isRead: false,
                isResolved: false,
            });
        }
        return closed;
    });
};
exports.closeCashShiftRecord = closeCashShiftRecord;
