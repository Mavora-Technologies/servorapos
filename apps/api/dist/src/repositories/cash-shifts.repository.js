"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeCashShiftRecord = exports.openCashShiftRecord = exports.getActiveShiftForCashier = exports.listTenantCashShifts = exports.getCashShiftMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
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
const listTenantCashShifts = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, query.branchId) : undefined,
        query.cashierId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, query.cashierId) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, query.status) : undefined,
        query.startDate ? (0, drizzle_orm_1.gte)(schema_1.cashierShifts.openedAt, new Date(query.startDate)) : undefined,
        query.endDate ? (0, drizzle_orm_1.lte)(schema_1.cashierShifts.openedAt, new Date(query.endDate)) : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.cashierShifts.id,
            branchId: schema_1.cashierShifts.branchId,
            branchName: schema_1.branches.name,
            cashierId: schema_1.cashierShifts.cashierId,
            cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            cashierEmail: schema_1.users.email,
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
    return {
        shifts: rows.map((r) => ({
            ...r,
            openingFloat: Number(r.openingFloat),
            expectedCash: Number(r.expectedCash),
            countedCash: r.countedCash !== null ? Number(r.countedCash) : null,
            variance: r.variance !== null ? Number(r.variance) : null,
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    };
};
exports.listTenantCashShifts = listTenantCashShifts;
const getActiveShiftForCashier = async (tenantId, cashierId, branchId) => {
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
    // Calculate live expected cash based on cash orders processed since openedAt
    const [cashTendered] = await db_1.db
        .select({
        totalCashInbound: (0, drizzle_orm_1.sql) `coalesce(sum(coalesce(${schema_1.orders.amountPaid}, 0)), 0)::numeric`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, cashierId), (0, drizzle_orm_1.eq)(schema_1.orders.paymentStatus, 'Paid'), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, active.openedAt)));
    const inboundSales = Number(cashTendered?.totalCashInbound || 0);
    const liveExpectedCash = Number(active.openingFloat) + inboundSales;
    return {
        ...active,
        openingFloat: Number(active.openingFloat),
        inboundCashSales: inboundSales,
        liveExpectedCash,
    };
};
exports.getActiveShiftForCashier = getActiveShiftForCashier;
const openCashShiftRecord = async (tenantId, cashierId, input) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Guard against concurrent active shifts for the same cashier
        const [existingOpen] = await tx
            .select({ id: schema_1.cashierShifts.id })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, cashierId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')))
            .limit(1);
        if (existingOpen) {
            throw new Error(`Shift #${existingOpen.id} is already open for this cashier. Close the current session first.`);
        }
        // 2. Open Cashier Shift
        const [shift] = await tx
            .insert(schema_1.cashierShifts)
            .values({
            tenantId,
            branchId: input.branchId,
            cashierId,
            openingFloat: String(input.openingFloat),
            expectedCash: String(input.openingFloat),
            status: 'OPEN',
        })
            .returning();
        // 3. If an explicit drawer is selected, link or open a drawerSession
        if (input.cashDrawerId) {
            await tx
                .insert(schema_1.drawerSessions)
                .values({
                tenantId,
                drawerId: input.cashDrawerId,
                cashierId,
                openingFloat: String(input.openingFloat),
                expectedClosingBalance: String(input.openingFloat),
                status: 'OPEN',
            });
            await tx
                .update(schema_1.cashDrawers)
                .set({ status: 'OPEN', currentBalance: String(input.openingFloat) })
                .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, input.cashDrawerId));
        }
        return shift;
    });
};
exports.openCashShiftRecord = openCashShiftRecord;
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
        // Calculate actual cash collected during this shift period
        const [cashTendered] = await tx
            .select({
            totalCash: (0, drizzle_orm_1.sql) `coalesce(sum(coalesce(${schema_1.orders.amountPaid}, 0)), 0)::numeric`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, shift.cashierId), (0, drizzle_orm_1.eq)(schema_1.orders.paymentStatus, 'Paid'), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, shift.openedAt)));
        const cashSales = Number(cashTendered?.totalCash || 0);
        const expectedCash = Number(shift.openingFloat) + cashSales;
        const countedCash = input.countedCash;
        const variance = Math.round((countedCash - expectedCash) * 100) / 100;
        // Update shift record to CLOSED
        const [closed] = await tx
            .update(schema_1.cashierShifts)
            .set({
            expectedCash: String(expectedCash),
            countedCash: String(countedCash),
            variance: String(variance),
            status: 'CLOSED',
            closedByUserId: supervisorId,
            varianceNotes: input.varianceNotes || (variance === 0 ? 'Balanced shift settlement' : null),
            closedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, shift.id))
            .returning();
        // Workday/SAP Paradigm: Automated Variance Escalation Trigger
        // If variance exceeds tolerance (> KES 500), dispatch notification & trigger rule
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
                actionUrl: '/cash-management/shifts',
                isRead: false,
                isResolved: false,
            });
        }
        return closed;
    });
};
exports.closeCashShiftRecord = closeCashShiftRecord;
