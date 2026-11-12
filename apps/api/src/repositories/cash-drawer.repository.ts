import { eq, desc, asc, and, sql, or, isNull, gte, ne } from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashDrawers,
  drawerSessions,
  cashierShifts,
  cashierAssignments,
  orders,
  payments,
  users,
  branches,
} from '../config/schema';
import {
  OpenDrawerSessionInput,
  CloseDrawerSessionInput,
  CashDropInput,
  CreateCashDrawerInput,
} from '../validators/cash-drawer.validator';

export const getDrawersDashboardData = async (tenantId: number, branchId?: number) => {
  const drawerBranchFilter = branchId
    ? or(eq(cashDrawers.branchId, branchId), isNull(cashDrawers.branchId))
    : undefined;

  const todayStr = new Date().toISOString().split('T')[0];

  const [drawersList, rawSessions, todayAssignments, staffList] = await Promise.all([
    db
      .select({
        id: cashDrawers.id,
        branchId: cashDrawers.branchId,
        branchName: branches.name,
        drawerCode: cashDrawers.drawerCode,
        name: cashDrawers.name,
        status: cashDrawers.status,
        currentBalance: cashDrawers.currentBalance,
      })
      .from(cashDrawers)
      .leftJoin(branches, eq(cashDrawers.branchId, branches.id))
      .where(and(eq(cashDrawers.tenantId, tenantId), drawerBranchFilter))
      .orderBy(asc(cashDrawers.drawerCode)),

    db
      .select({
        id: drawerSessions.id,
        drawerId: drawerSessions.drawerId,
        drawerBranchId: cashDrawers.branchId,
        drawerName: cashDrawers.name,
        drawerCode: cashDrawers.drawerCode,
        status: drawerSessions.status,
        openingFloat: drawerSessions.openingFloat,
        cashSalesTotal: drawerSessions.cashSalesTotal,
        cashDropsTotal: drawerSessions.cashDropsTotal,
        payoutsTotal: drawerSessions.payoutsTotal,
        expectedClosingBalance: drawerSessions.expectedClosingBalance,
        cashierId: drawerSessions.cashierId,
        cashierName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        cashierEmail: users.email,
        cashierRole: users.role,
        openedAt: drawerSessions.openedAt,
      })
      .from(drawerSessions)
      .innerJoin(cashDrawers, eq(drawerSessions.drawerId, cashDrawers.id))
      .leftJoin(users, eq(drawerSessions.cashierId, users.id))
      .where(
        and(
          eq(drawerSessions.tenantId, tenantId),
          sql`${drawerSessions.status} != 'CLOSED_RECONCILED'`
        )
      )
      .orderBy(desc(drawerSessions.openedAt)),

    db
      .select({
        id: cashierAssignments.id,
        cashDrawerId: cashierAssignments.cashDrawerId,
        userId: cashierAssignments.userId,
        custodianName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        custodianRole: users.role,
        shiftType: cashierAssignments.shiftType,
        allocatedFloat: cashierAssignments.allocatedFloat,
        maxCashLimit: cashierAssignments.maxCashLimit,
      })
      .from(cashierAssignments)
      .innerJoin(users, eq(cashierAssignments.userId, users.id))
      .where(
        and(
          eq(cashierAssignments.tenantId, tenantId),
          eq(cashierAssignments.assignmentDate, todayStr)
        )
      ),

    db
      .select({
        id: users.id,
        fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.firstName)),
  ]);

  // Enrich each active session with real-time POS sales from BOTH orders & payments tables
  const enrichedSessions = await Promise.all(
    rawSessions.map(async (session) => {
      const effectiveBranchId = branchId || session.drawerBranchId;

      const scopeFilter = session.cashierId
        ? or(
            eq(orders.cashierId, session.cashierId),
            eq(orders.waiterId, session.cashierId),
            and(
              isNull(orders.cashierId),
              effectiveBranchId ? eq(orders.branchId, effectiveBranchId) : sql`true`
            )
          )
        : effectiveBranchId
        ? eq(orders.branchId, effectiveBranchId)
        : sql`true`;

      const [[orderSalesAgg], [paymentSalesAgg]] = await Promise.all([
        // 1. Sum POS Orders created since session opened (Paid or Completed/Served POS checks)
        db
          .select({
            totalFromOrders: sql<number>`coalesce(sum(
              case 
                when coalesce(${orders.amountPaid}, 0) > 0 then ${orders.amountPaid}
                else coalesce(${orders.total}, 0)
              end
            ), 0)::numeric`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.tenantId, tenantId),
              sql`UPPER(${orders.status}) != 'CANCELLED'`,
              sql`UPPER(${orders.paymentStatus}) != 'REFUNDED'`,
              gte(orders.createdAt, session.openedAt),
              scopeFilter
            )
          ),

        // 2. Sum Inbound Cash Payments recorded in payments ledger since session opened
        db
          .select({
            totalFromPayments: sql<number>`coalesce(sum(${payments.amount}), 0)::numeric`,
          })
          .from(payments)
          .where(
            and(
              eq(payments.tenantId, tenantId),
              eq(payments.paymentFlow, 'INBOUND_AR'),
              eq(payments.paymentMethod, 'CASH_DRAWER'),
              eq(payments.isReversed, false),
              gte(payments.createdAt, session.openedAt),
              session.cashierId ? eq(payments.processedById, session.cashierId) : sql`true`
            )
          ),
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
    })
  );

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

export const openDrawerSessionRecord = async (
  tenantId: number,
  authUserId: number,
  payload: OpenDrawerSessionInput
) => {
  const targetCashierId = payload.cashierId || authUserId;

  return await db.transaction(async (tx) => {
    const [drawer] = await tx
      .select()
      .from(cashDrawers)
      .where(and(eq(cashDrawers.id, payload.drawerId), eq(cashDrawers.tenantId, tenantId)))
      .limit(1);

    if (!drawer) throw new Error('Cash drawer terminal not found');
    if (drawer.status === 'OPEN') throw new Error('Drawer is already open with an active session');

    const [existingShift] = await tx
      .select({ id: cashierShifts.id })
      .from(cashierShifts)
      .where(
        and(
          eq(cashierShifts.tenantId, tenantId),
          eq(cashierShifts.cashierId, targetCashierId),
          eq(cashierShifts.status, 'OPEN')
        )
      )
      .limit(1);

    if (!existingShift) {
      await tx.insert(cashierShifts).values({
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
      .update(cashDrawers)
      .set({
        status: 'OPEN',
        currentBalance: payload.openingFloat.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(cashDrawers.id, drawer.id));

    const [session] = await tx
      .insert(drawerSessions)
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

export const recordDrawerCashDrop = async (tenantId: number, payload: CashDropInput) => {
  return await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(drawerSessions)
      .where(and(eq(drawerSessions.id, payload.sessionId), eq(drawerSessions.tenantId, tenantId)))
      .limit(1);

    if (!session) throw new Error('Active drawer session not found');

    const currentDrops = parseFloat(session.cashDropsTotal) || 0;
    const expected = parseFloat(session.expectedClosingBalance) || 0;
    const newDrops = currentDrops + payload.amount;
    const newExpected = Math.max(0, expected - payload.amount);

    const [updatedSession] = await tx
      .update(drawerSessions)
      .set({
        cashDropsTotal: newDrops.toFixed(4),
        expectedClosingBalance: newExpected.toFixed(4),
      })
      .where(eq(drawerSessions.id, session.id))
      .returning();

    await tx
      .update(cashDrawers)
      .set({ currentBalance: newExpected.toFixed(2), updatedAt: new Date() })
      .where(eq(cashDrawers.id, session.drawerId));

    return updatedSession;
  });
};

export const closeDrawerSessionRecord = async (
  tenantId: number,
  supervisorId: number,
  sessionId: number,
  payload: CloseDrawerSessionInput
) => {
  return await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(drawerSessions)
      .where(and(eq(drawerSessions.id, sessionId), eq(drawerSessions.tenantId, tenantId)))
      .limit(1);

    if (!session) throw new Error('Drawer session not found');
    if (session.status === 'CLOSED_RECONCILED') {
      throw new Error('Session is already closed and reconciled');
    }

    const [salesAgg] = await tx
      .select({
        totalFromOrders: sql<number>`coalesce(sum(
          case 
            when coalesce(${orders.amountPaid}, 0) > 0 then ${orders.amountPaid}
            else coalesce(${orders.total}, 0)
          end
        ), 0)::numeric`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          sql`UPPER(${orders.status}) != 'CANCELLED'`,
          sql`UPPER(${orders.paymentStatus}) != 'REFUNDED'`,
          gte(orders.createdAt, session.openedAt),
          session.cashierId
            ? or(eq(orders.cashierId, session.cashierId), eq(orders.waiterId, session.cashierId))
            : sql`true`
        )
      );

    const liveSales = Math.max(
      Number(session.cashSalesTotal) || 0,
      Number(salesAgg?.totalFromOrders || 0)
    );

    const expected = Math.max(
      0,
      (parseFloat(session.openingFloat) || 0) +
        liveSales -
        (parseFloat(session.cashDropsTotal) || 0) -
        (parseFloat(session.payoutsTotal) || 0)
    );
    const actual = payload.actualClosingBalance;
    const variance = Number((actual - expected).toFixed(2));

    const [closedSession] = await tx
      .update(drawerSessions)
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
      .where(eq(drawerSessions.id, session.id))
      .returning();

    await tx
      .update(cashDrawers)
      .set({
        status: 'CLOSED',
        currentBalance: '0.00',
        updatedAt: new Date(),
      })
      .where(eq(cashDrawers.id, session.drawerId));

    if (session.cashierId) {
      await tx
        .update(cashierShifts)
        .set({
          expectedCash: expected.toFixed(2),
          countedCash: actual.toFixed(2),
          variance: variance.toFixed(2),
          status: 'CLOSED',
          closedByUserId: supervisorId,
          varianceNotes: payload.notes || 'Reconciled via POS Cash Drawer closeout',
          closedAt: new Date(),
        })
        .where(
          and(
            eq(cashierShifts.tenantId, tenantId),
            eq(cashierShifts.cashierId, session.cashierId),
            eq(cashierShifts.status, 'OPEN')
          )
        );
    }

    return closedSession;
  });
};

export const createCashDrawerRecord = async (
  tenantId: number,
  branchId: number | null,
  payload: CreateCashDrawerInput
) => {
  const [newDrawer] = await db
    .insert(cashDrawers)
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