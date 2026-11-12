import { eq, and, desc, asc, sql, or, isNull, gte, lte, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashierShifts,
  cashDrawers,
  drawerSessions,
  cashierAssignments,
  orders,
  users,
  branches,
  notifications,
  auditLogs,
} from '../config/schema';
import {
  OpenShiftInput,
  CloseShiftInput,
  ShiftCashMovementInput,
  ListShiftsQuery,
} from '../validators/cash-shifts.validator';

export const getShiftCockpitSetup = async (tenantId: number, branchId?: number) => {
  const drawerBranchFilter = branchId
    ? or(eq(cashDrawers.branchId, branchId), isNull(cashDrawers.branchId))
    : undefined;

  const todayStr = new Date().toISOString().split('T')[0];

  const [staffList, branchDrawers, todayAssignments] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        email: users.email,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.firstName)),

    db
      .select({
        id: cashDrawers.id,
        drawerCode: cashDrawers.drawerCode,
        name: cashDrawers.name,
        status: cashDrawers.status,
        currentBalance: cashDrawers.currentBalance,
        branchId: cashDrawers.branchId,
      })
      .from(cashDrawers)
      .where(and(eq(cashDrawers.tenantId, tenantId), drawerBranchFilter))
      .orderBy(asc(cashDrawers.drawerCode)),

    db
      .select({
        id: cashierAssignments.id,
        userId: cashierAssignments.userId,
        cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        cashDrawerId: cashierAssignments.cashDrawerId,
        drawerName: cashDrawers.name,
        drawerCode: cashDrawers.drawerCode,
        shiftType: cashierAssignments.shiftType,
        allocatedFloat: cashierAssignments.allocatedFloat,
        maxCashLimit: cashierAssignments.maxCashLimit,
        status: cashierAssignments.status,
      })
      .from(cashierAssignments)
      .innerJoin(users, eq(cashierAssignments.userId, users.id))
      .innerJoin(cashDrawers, eq(cashierAssignments.cashDrawerId, cashDrawers.id))
      .where(
        and(
          eq(cashierAssignments.tenantId, tenantId),
          eq(cashierAssignments.assignmentDate, todayStr),
          branchId ? eq(cashierAssignments.branchId, branchId) : undefined
        )
      ),
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

export const getCashShiftMetrics = async (tenantId: number, branchId?: number) => {
  const branchCondition = branchId ? eq(cashierShifts.branchId, branchId) : undefined;

  const [metrics] = await db
    .select({
      totalShifts: sql<number>`count(*)::int`,
      activeOpenShifts: sql<number>`count(case when ${cashierShifts.status} = 'OPEN' then 1 end)::int`,
      totalCashVolume: sql<number>`coalesce(sum(case when ${cashierShifts.status} = 'CLOSED' then coalesce(${cashierShifts.countedCash}, 0) else 0 end), 0)::numeric`,
      totalNetVariance: sql<number>`coalesce(sum(case when ${cashierShifts.status} = 'CLOSED' then coalesce(${cashierShifts.variance}, 0) else 0 end), 0)::numeric`,
      discrepancyCount: sql<number>`count(case when ${cashierShifts.status} = 'CLOSED' and abs(coalesce(${cashierShifts.variance}, 0)) > 50 then 1 end)::int`,
    })
    .from(cashierShifts)
    .where(and(eq(cashierShifts.tenantId, tenantId), branchCondition));

  return {
    totalShifts: Number(metrics?.totalShifts || 0),
    activeOpenShifts: Number(metrics?.activeOpenShifts || 0),
    totalCashVolumeKes: Number(metrics?.totalCashVolume || 0),
    totalNetVarianceKes: Number(metrics?.totalNetVariance || 0),
    discrepancyCount: Number(metrics?.discrepancyCount || 0),
  };
};

export const listTenantCashShifts = async (tenantId: number, query: ListShiftsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(cashierShifts.tenantId, tenantId),
    query.branchId ? eq(cashierShifts.branchId, query.branchId) : undefined,
    query.cashierId ? eq(cashierShifts.cashierId, query.cashierId) : undefined,
    query.status && query.status !== 'ALL' ? eq(cashierShifts.status, query.status) : undefined,
    query.search
      ? or(
          ilike(users.firstName, `%${query.search}%`),
          ilike(users.lastName, `%${query.search}%`),
          ilike(users.email, `%${query.search}%`)
        )
      : undefined,
    query.startDate ? gte(cashierShifts.openedAt, new Date(query.startDate)) : undefined,
    query.endDate ? lte(cashierShifts.openedAt, new Date(query.endDate)) : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(cashierShifts)
      .leftJoin(users, eq(cashierShifts.cashierId, users.id))
      .where(and(...conditions)),
    db
      .select({
        id: cashierShifts.id,
        branchId: cashierShifts.branchId,
        branchName: branches.name,
        cashierId: cashierShifts.cashierId,
        cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        cashierEmail: users.email,
        cashierRole: users.role,
        openingFloat: cashierShifts.openingFloat,
        expectedCash: cashierShifts.expectedCash,
        countedCash: cashierShifts.countedCash,
        variance: cashierShifts.variance,
        status: cashierShifts.status,
        varianceNotes: cashierShifts.varianceNotes,
        openedAt: cashierShifts.openedAt,
        closedAt: cashierShifts.closedAt,
        closedByName: sql<string | null>`(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM users u WHERE u.id = ${cashierShifts.closedByUserId})`,
      })
      .from(cashierShifts)
      .leftJoin(branches, eq(cashierShifts.branchId, branches.id))
      .leftJoin(users, eq(cashierShifts.cashierId, users.id))
      .where(and(...conditions))
      .orderBy(desc(cashierShifts.openedAt))
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

export const getActiveShiftForCashier = async (tenantId: number, cashierId: number) => {
  const [active] = await db
    .select({
      id: cashierShifts.id,
      branchId: cashierShifts.branchId,
      branchName: branches.name,
      cashierId: cashierShifts.cashierId,
      openingFloat: cashierShifts.openingFloat,
      expectedCash: cashierShifts.expectedCash,
      status: cashierShifts.status,
      openedAt: cashierShifts.openedAt,
    })
    .from(cashierShifts)
    .leftJoin(branches, eq(cashierShifts.branchId, branches.id))
    .where(
      and(
        eq(cashierShifts.tenantId, tenantId),
        eq(cashierShifts.cashierId, cashierId),
        eq(cashierShifts.status, 'OPEN')
      )
    )
    .limit(1);

  if (!active) return null;

  const [[cashTendered], [linkedSession]] = await Promise.all([
    db
      .select({
        totalCashInbound: sql<number>`coalesce(sum(coalesce(${orders.amountPaid}, 0)), 0)::numeric`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.cashierId, cashierId),
          eq(orders.paymentStatus, 'Paid'),
          gte(orders.createdAt, active.openedAt)
        )
      ),
    db
      .select({
        id: drawerSessions.id,
        drawerId: drawerSessions.drawerId,
        drawerName: cashDrawers.name,
        drawerCode: cashDrawers.drawerCode,
        cashDropsTotal: drawerSessions.cashDropsTotal,
        payoutsTotal: drawerSessions.payoutsTotal,
      })
      .from(drawerSessions)
      .innerJoin(cashDrawers, eq(drawerSessions.drawerId, cashDrawers.id))
      .where(
        and(
          eq(drawerSessions.tenantId, tenantId),
          eq(drawerSessions.cashierId, cashierId),
          eq(drawerSessions.status, 'OPEN')
        )
      )
      .orderBy(desc(drawerSessions.openedAt))
      .limit(1),
  ]);

  const inboundSales = Number(cashTendered?.totalCashInbound || 0);
  const safeDrops = Number(linkedSession?.cashDropsTotal || 0);
  const payouts = Number(linkedSession?.payoutsTotal || 0);
  const liveExpectedCash = Math.max(
    0,
    Number(active.openingFloat) + inboundSales - safeDrops - payouts
  );

  return {
    ...active,
    openingFloat: Number(active.openingFloat),
    inboundCashSales: inboundSales,
    safeDropsTotal: safeDrops,
    payoutsTotal: payouts,
    liveExpectedCash,
    drawerSession: linkedSession || null,
  };
};

export const openCashShiftRecord = async (
  tenantId: number,
  authenticatedUserId: number,
  input: OpenShiftInput
) => {
  const targetCashierId = input.cashierId || authenticatedUserId;

  return await db.transaction(async (tx) => {
    // 1. Guard against concurrent active shifts for the target cashier
    const [existingOpen] = await tx
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

    if (existingOpen) {
      throw new Error(
        `Shift #${existingOpen.id} is already open for this staff member. Close the active shift before opening another.`
      );
    }

    // 2. If a cash drawer is specified, verify it belongs to tenant and is CLOSED
    if (input.cashDrawerId) {
      const [drawer] = await tx
        .select()
        .from(cashDrawers)
        .where(and(eq(cashDrawers.id, input.cashDrawerId), eq(cashDrawers.tenantId, tenantId)))
        .limit(1);

      if (!drawer) throw new Error('Selected cash drawer register not found');
      if (drawer.status === 'OPEN') {
        throw new Error(`Cash drawer "${drawer.name}" is already locked to another active shift.`);
      }
    }

    // 3. Open Cashier Shift
    const [shift] = await tx
      .insert(cashierShifts)
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

    // 4. Bind Physical Drawer Session & Update Drawer Status
    if (input.cashDrawerId) {
      await tx.insert(drawerSessions).values({
        tenantId,
        drawerId: input.cashDrawerId,
        cashierId: targetCashierId,
        supervisorId: authenticatedUserId !== targetCashierId ? authenticatedUserId : null,
        openingFloat: input.openingFloat.toFixed(4),
        expectedClosingBalance: input.openingFloat.toFixed(4),
        status: 'OPEN',
        notes: input.notes || `${input.shiftType} shift float initialized`,
      });

      await tx
        .update(cashDrawers)
        .set({
          status: 'OPEN',
          currentBalance: input.openingFloat.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(cashDrawers.id, input.cashDrawerId));
    }

    // 5. Immutable Audit Log
    await tx.insert(auditLogs).values({
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

export const recordShiftCashMovement = async (
  tenantId: number,
  userId: number,
  input: ShiftCashMovementInput
) => {
  return await db.transaction(async (tx) => {
    const [shift] = await tx
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.id, input.shiftId), eq(cashierShifts.tenantId, tenantId)))
      .limit(1);

    if (!shift) throw new Error('Cashier shift not found');
    if (shift.status !== 'OPEN') throw new Error('Cannot record cash movements on a closed shift');

    const [session] = await tx
      .select()
      .from(drawerSessions)
      .where(
        and(
          eq(drawerSessions.tenantId, tenantId),
          eq(drawerSessions.cashierId, shift.cashierId),
          eq(drawerSessions.status, 'OPEN')
        )
      )
      .orderBy(desc(drawerSessions.openedAt))
      .limit(1);

    if (session) {
      const currentDrops = Number(session.cashDropsTotal || 0);
      const currentPayouts = Number(session.payoutsTotal || 0);
      const currentExpected = Number(session.expectedClosingBalance || 0);

      const newDrops =
        input.movementType === 'SAFE_DROP' ? currentDrops + input.amount : currentDrops;
      const newPayouts =
        input.movementType === 'PETTY_CASH_PAYOUT' ? currentPayouts + input.amount : currentPayouts;
      const newExpected = Math.max(0, currentExpected - input.amount);

      await tx
        .update(drawerSessions)
        .set({
          cashDropsTotal: newDrops.toFixed(4),
          payoutsTotal: newPayouts.toFixed(4),
          expectedClosingBalance: newExpected.toFixed(4),
        })
        .where(eq(drawerSessions.id, session.id));

      await tx
        .update(cashDrawers)
        .set({
          currentBalance: newExpected.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(cashDrawers.id, session.drawerId));
    }

    const currentShiftExpected = Number(shift.expectedCash || 0);
    const updatedShiftExpected = Math.max(0, currentShiftExpected - input.amount);

    const [updatedShift] = await tx
      .update(cashierShifts)
      .set({ expectedCash: updatedShiftExpected.toFixed(2) })
      .where(eq(cashierShifts.id, shift.id))
      .returning();

    await tx.insert(auditLogs).values({
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

export const closeCashShiftRecord = async (
  tenantId: number,
  supervisorId: number,
  input: CloseShiftInput
) => {
  return await db.transaction(async (tx) => {
    const [shift] = await tx
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.id, input.shiftId), eq(cashierShifts.tenantId, tenantId)))
      .limit(1);

    if (!shift) throw new Error('Cashier shift not found');
    if (shift.status === 'CLOSED') throw new Error('Shift is already reconciled and closed');

    const [[cashTendered], [linkedSession]] = await Promise.all([
      tx
        .select({
          totalCash: sql<number>`coalesce(sum(coalesce(${orders.amountPaid}, 0)), 0)::numeric`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, tenantId),
            eq(orders.cashierId, shift.cashierId),
            eq(orders.paymentStatus, 'Paid'),
            gte(orders.createdAt, shift.openedAt)
          )
        ),
      tx
        .select()
        .from(drawerSessions)
        .where(
          and(
            eq(drawerSessions.tenantId, tenantId),
            eq(drawerSessions.cashierId, shift.cashierId),
            eq(drawerSessions.status, 'OPEN')
          )
        )
        .orderBy(desc(drawerSessions.openedAt))
        .limit(1),
    ]);

    const cashSales = Number(cashTendered?.totalCash || 0);
    const safeDrops = Number(linkedSession?.cashDropsTotal || 0);
    const payouts = Number(linkedSession?.payoutsTotal || 0);
    const expectedCash = Math.max(
      0,
      Number(shift.openingFloat) + cashSales - safeDrops - payouts
    );
    const countedCash = input.countedCash;
    const variance = Math.round((countedCash - expectedCash) * 100) / 100;

    // 1. Update shift record to CLOSED
    const [closed] = await tx
      .update(cashierShifts)
      .set({
        expectedCash: expectedCash.toFixed(2),
        countedCash: countedCash.toFixed(2),
        variance: variance.toFixed(2),
        status: 'CLOSED',
        closedByUserId: supervisorId,
        varianceNotes: input.varianceNotes || (variance === 0 ? 'Balanced shift settlement' : null),
        closedAt: new Date(),
      })
      .where(eq(cashierShifts.id, shift.id))
      .returning();

    // 2. Close & Unlock Linked Drawer Session
    if (linkedSession) {
      await tx
        .update(drawerSessions)
        .set({
          status: 'CLOSED_RECONCILED',
          cashSalesTotal: cashSales.toFixed(4),
          expectedClosingBalance: expectedCash.toFixed(4),
          actualClosingBalance: countedCash.toFixed(4),
          variance: variance.toFixed(4),
          denominations: input.denominations || {},
          supervisorId,
          closedAt: new Date(),
          notes: input.varianceNotes || 'Shift closed and reconciled',
        })
        .where(eq(drawerSessions.id, linkedSession.id));

      await tx
        .update(cashDrawers)
        .set({
          status: 'CLOSED',
          currentBalance: '0.00',
          updatedAt: new Date(),
        })
        .where(eq(cashDrawers.id, linkedSession.drawerId));
    }

    // 3. Automated Variance Escalation Trigger
    if (Math.abs(variance) >= 500) {
      await tx.insert(notifications).values({
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