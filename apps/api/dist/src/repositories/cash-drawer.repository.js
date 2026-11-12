"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCashDrawerRecord = exports.closeDrawerSessionRecord = exports.recordDrawerCashDrop = exports.openDrawerSessionRecord = exports.getDrawersDashboardData = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getDrawersDashboardData = async (tenantId, branchId) => {
    const drawerBranchFilter = branchId
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, branchId), (0, drizzle_orm_1.isNull)(schema_1.cashDrawers.branchId))
        : undefined;
    const todayStr = new Date().toISOString().split('T')[0];
    const [drawersList, rawSessions, todayAssignments, staffList] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.cashDrawers.id,
            branchId: schema_1.cashDrawers.branchId,
            branchName: schema_1.branches.name,
            drawerCode: schema_1.cashDrawers.drawerCode,
            name: schema_1.cashDrawers.name,
            status: schema_1.cashDrawers.status,
            currentBalance: schema_1.cashDrawers.currentBalance,
        })
            .from(schema_1.cashDrawers)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), drawerBranchFilter))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.cashDrawers.drawerCode)),
        db_1.db
            .select({
            id: schema_1.drawerSessions.id,
            drawerId: schema_1.drawerSessions.drawerId,
            drawerBranchId: schema_1.cashDrawers.branchId,
            drawerName: schema_1.cashDrawers.name,
            drawerCode: schema_1.cashDrawers.drawerCode,
            status: schema_1.drawerSessions.status,
            openingFloat: schema_1.drawerSessions.openingFloat,
            cashSalesTotal: schema_1.drawerSessions.cashSalesTotal,
            cashDropsTotal: schema_1.drawerSessions.cashDropsTotal,
            payoutsTotal: schema_1.drawerSessions.payoutsTotal,
            expectedClosingBalance: schema_1.drawerSessions.expectedClosingBalance,
            cashierId: schema_1.drawerSessions.cashierId,
            cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            cashierEmail: schema_1.users.email,
            cashierRole: schema_1.users.role,
            openedAt: schema_1.drawerSessions.openedAt,
        })
            .from(schema_1.drawerSessions)
            .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.cashierId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt)),
        db_1.db
            .select({
            id: schema_1.cashierAssignments.id,
            cashDrawerId: schema_1.cashierAssignments.cashDrawerId,
            userId: schema_1.cashierAssignments.userId,
            custodianName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            custodianRole: schema_1.users.role,
            shiftType: schema_1.cashierAssignments.shiftType,
            allocatedFloat: schema_1.cashierAssignments.allocatedFloat,
            maxCashLimit: schema_1.cashierAssignments.maxCashLimit,
        })
            .from(schema_1.cashierAssignments)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierAssignments.assignmentDate, todayStr))),
        db_1.db
            .select({
            id: schema_1.users.id,
            fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName)),
    ]);
    // Enrich each active session with real-time POS sales from BOTH orders & payments tables
    const enrichedSessions = await Promise.all(rawSessions.map(async (session) => {
        const effectiveBranchId = branchId || session.drawerBranchId;
        const scopeFilter = session.cashierId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.orders.cashierId, session.cashierId), (0, drizzle_orm_1.eq)(schema_1.orders.waiterId, session.cashierId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(schema_1.orders.cashierId), effectiveBranchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, effectiveBranchId) : (0, drizzle_orm_1.sql) `true`))
            : effectiveBranchId
                ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, effectiveBranchId)
                : (0, drizzle_orm_1.sql) `true`;
        const [[orderSalesAgg], [paymentSalesAgg]] = await Promise.all([
            // 1. Sum POS Orders created since session opened (Paid or Completed/Served POS checks)
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
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.status}) != 'CANCELLED'`, (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) != 'REFUNDED'`, (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, session.openedAt), scopeFilter)),
            // 2. Sum Inbound Cash Payments recorded in payments ledger since session opened
            db_1.db
                .select({
                totalFromPayments: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.payments.amount}), 0)::numeric`,
            })
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.payments.paymentFlow, 'INBOUND_AR'), (0, drizzle_orm_1.eq)(schema_1.payments.paymentMethod, 'CASH_DRAWER'), (0, drizzle_orm_1.eq)(schema_1.payments.isReversed, false), (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, session.openedAt), session.cashierId ? (0, drizzle_orm_1.eq)(schema_1.payments.processedById, session.cashierId) : (0, drizzle_orm_1.sql) `true`)),
        ]);
        const storedSales = Number(session.cashSalesTotal) || 0;
        const fromOrders = Number(orderSalesAgg?.totalFromOrders || 0);
        const fromPayments = Number(paymentSalesAgg?.totalFromPayments || 0);
        const liveSales = Math.max(storedSales, fromOrders, fromPayments);
        const floatAmt = Number(session.openingFloat) || 0;
        const dropsAmt = Number(session.cashDropsTotal) || 0;
        const payoutsAmt = Number(session.payoutsTotal) || 0;
        const liveExpectedBalance = Math.max(0, floatAmt + liveSales - dropsAmt - payoutsAmt);
        return {
            ...session,
            openingFloat: floatAmt.toFixed(2),
            liveCashSales: liveSales.toFixed(2),
            cashDropsTotal: dropsAmt.toFixed(2),
            payoutsTotal: payoutsAmt.toFixed(2),
            expectedClosingBalance: liveExpectedBalance.toFixed(2),
        };
    }));
    let totalFloatLiquidity = 0;
    let totalLiveSalesVolume = 0;
    const enrichedDrawers = drawersList.map((d) => {
        const activeSession = enrichedSessions.find((s) => s.drawerId === d.id) || null;
        const scheduledCustodian = todayAssignments.find((a) => a.cashDrawerId === d.id) || null;
        const effectiveBalance = activeSession
            ? Number(activeSession.expectedClosingBalance)
            : Number(d.currentBalance) || 0;
        totalFloatLiquidity += effectiveBalance;
        if (activeSession) {
            totalLiveSalesVolume += Number(activeSession.liveCashSales);
        }
        return {
            ...d,
            currentBalance: effectiveBalance.toFixed(2),
            activeSession,
            scheduledCustodian: scheduledCustodian
                ? {
                    ...scheduledCustodian,
                    allocatedFloat: Number(scheduledCustodian.allocatedFloat),
                    maxCashLimit: Number(scheduledCustodian.maxCashLimit),
                }
                : null,
        };
    });
    return {
        summary: {
            totalDrawersCount: enrichedDrawers.length,
            activeSessionsCount: enrichedSessions.length,
            totalFloatLiquidity: Number(totalFloatLiquidity.toFixed(2)),
            totalLiveSalesVolume: Number(totalLiveSalesVolume.toFixed(2)),
        },
        drawers: enrichedDrawers,
        activeSessions: enrichedSessions,
        staff: staffList,
    };
};
exports.getDrawersDashboardData = getDrawersDashboardData;
const openDrawerSessionRecord = async (tenantId, authUserId, payload) => {
    const targetCashierId = payload.cashierId || authUserId;
    return await db_1.db.transaction(async (tx) => {
        const [drawer] = await tx
            .select()
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, payload.drawerId), (0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId)))
            .limit(1);
        if (!drawer)
            throw new Error('Cash drawer terminal not found');
        if (drawer.status === 'OPEN')
            throw new Error('Drawer is already open with an active session');
        const [existingShift] = await tx
            .select({ id: schema_1.cashierShifts.id })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, targetCashierId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')))
            .limit(1);
        if (!existingShift) {
            await tx.insert(schema_1.cashierShifts).values({
                tenantId,
                branchId: drawer.branchId,
                cashierId: targetCashierId,
                openingFloat: payload.openingFloat.toFixed(2),
                expectedCash: payload.openingFloat.toFixed(2),
                status: 'OPEN',
                varianceNotes: payload.notes || `Opened via ${drawer.drawerCode}`,
            });
        }
        await tx
            .update(schema_1.cashDrawers)
            .set({
            status: 'OPEN',
            currentBalance: payload.openingFloat.toFixed(2),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, drawer.id));
        const [session] = await tx
            .insert(schema_1.drawerSessions)
            .values({
            tenantId,
            drawerId: drawer.id,
            cashierId: targetCashierId,
            supervisorId: authUserId !== targetCashierId ? authUserId : null,
            status: 'ACTIVE',
            openingFloat: payload.openingFloat.toFixed(4),
            expectedClosingBalance: payload.openingFloat.toFixed(4),
            notes: payload.notes || 'Shift float initialized',
        })
            .returning();
        return session;
    });
};
exports.openDrawerSessionRecord = openDrawerSessionRecord;
const recordDrawerCashDrop = async (tenantId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [session] = await tx
            .select()
            .from(schema_1.drawerSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, payload.sessionId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId)))
            .limit(1);
        if (!session)
            throw new Error('Active drawer session not found');
        const currentDrops = parseFloat(session.cashDropsTotal) || 0;
        const expected = parseFloat(session.expectedClosingBalance) || 0;
        const newDrops = currentDrops + payload.amount;
        const newExpected = Math.max(0, expected - payload.amount);
        const [updatedSession] = await tx
            .update(schema_1.drawerSessions)
            .set({
            cashDropsTotal: newDrops.toFixed(4),
            expectedClosingBalance: newExpected.toFixed(4),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, session.id))
            .returning();
        await tx
            .update(schema_1.cashDrawers)
            .set({ currentBalance: newExpected.toFixed(2), updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, session.drawerId));
        return updatedSession;
    });
};
exports.recordDrawerCashDrop = recordDrawerCashDrop;
const closeDrawerSessionRecord = async (tenantId, supervisorId, sessionId, payload) => {
    return await db_1.db.transaction(async (tx) => {
        const [session] = await tx
            .select()
            .from(schema_1.drawerSessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, sessionId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId)))
            .limit(1);
        if (!session)
            throw new Error('Drawer session not found');
        if (session.status === 'CLOSED_RECONCILED') {
            throw new Error('Session is already closed and reconciled');
        }
        const [salesAgg] = await tx
            .select({
            totalFromOrders: (0, drizzle_orm_1.sql) `coalesce(sum(
          case 
            when coalesce(${schema_1.orders.amountPaid}, 0) > 0 then ${schema_1.orders.amountPaid}
            else coalesce(${schema_1.orders.total}, 0)
          end
        ), 0)::numeric`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.status}) != 'CANCELLED'`, (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) != 'REFUNDED'`, (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, session.openedAt), session.cashierId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.orders.cashierId, session.cashierId), (0, drizzle_orm_1.eq)(schema_1.orders.waiterId, session.cashierId))
            : (0, drizzle_orm_1.sql) `true`));
        const liveSales = Math.max(Number(session.cashSalesTotal) || 0, Number(salesAgg?.totalFromOrders || 0));
        const expected = Math.max(0, (parseFloat(session.openingFloat) || 0) +
            liveSales -
            (parseFloat(session.cashDropsTotal) || 0) -
            (parseFloat(session.payoutsTotal) || 0));
        const actual = payload.actualClosingBalance;
        const variance = Number((actual - expected).toFixed(2));
        const [closedSession] = await tx
            .update(schema_1.drawerSessions)
            .set({
            status: 'CLOSED_RECONCILED',
            cashSalesTotal: liveSales.toFixed(4),
            expectedClosingBalance: expected.toFixed(4),
            actualClosingBalance: actual.toFixed(4),
            variance: variance.toFixed(4),
            denominations: payload.denominations || {},
            supervisorId,
            closedAt: new Date(),
            notes: payload.notes ? `Closed. Note: ${payload.notes}` : 'Shift closed and reconciled',
        })
            .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, session.id))
            .returning();
        await tx
            .update(schema_1.cashDrawers)
            .set({
            status: 'CLOSED',
            currentBalance: '0.00',
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, session.drawerId));
        if (session.cashierId) {
            await tx
                .update(schema_1.cashierShifts)
                .set({
                expectedCash: expected.toFixed(2),
                countedCash: actual.toFixed(2),
                variance: variance.toFixed(2),
                status: 'CLOSED',
                closedByUserId: supervisorId,
                varianceNotes: payload.notes || 'Reconciled via POS Cash Drawer closeout',
                closedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, session.cashierId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')));
        }
        return closedSession;
    });
};
exports.closeDrawerSessionRecord = closeDrawerSessionRecord;
const createCashDrawerRecord = async (tenantId, branchId, payload) => {
    const [newDrawer] = await db_1.db
        .insert(schema_1.cashDrawers)
        .values({
        tenantId,
        branchId,
        drawerCode: payload.drawerCode,
        name: payload.name,
        status: 'CLOSED',
        currentBalance: '0.00',
    })
        .returning();
    return newDrawer;
};
exports.createCashDrawerRecord = createCashDrawerRecord;
