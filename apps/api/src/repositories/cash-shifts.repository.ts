import { eq, and, desc, sql, or, isNull, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashierShifts,
  cashDrawers,
  drawerSessions,
  orders,
  payments,
  users,
  branches,
  workflowRules,
  notifications,
} from '../config/schema';
import {
  OpenShiftInput,
  CloseShiftInput,
  RecordDropOrPayoutInput,
  ListShiftsQuery,
} from '../validators/cash-shifts.validator';

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
    query.startDate ? gte(cashierShifts.openedAt, new Date(query.startDate)) : undefined,
    query.endDate ? lte(cashierShifts.openedAt, new Date(query.endDate)) : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(cashierShifts)
      .where(and(...conditions)),
    db
      .select({
        id: cashierShifts.id,
        branchId: cashierShifts.branchId,
        branchName: branches.name,
        cashierId: cashierShifts.cashierId,
        cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        cashierEmail: users.email,
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

export const getActiveShiftForCashier = async (tenantId: number, cashierId: number, branchId?: number) => {
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

  // Calculate live expected cash based on cash orders processed since openedAt
  const [cashTendered] = await db
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
    );

  const inboundSales = Number(cashTendered?.totalCashInbound || 0);
  const liveExpectedCash = Number(active.openingFloat) + inboundSales;

  return {
    ...active,
    openingFloat: Number(active.openingFloat),
    inboundCashSales: inboundSales,
    liveExpectedCash,
  };
};

export const openCashShiftRecord = async (tenantId: number, cashierId: number, input: OpenShiftInput) => {
  return await db.transaction(async (tx) => {
    // 1. Guard against concurrent active shifts for the same cashier
    const [existingOpen] = await tx
      .select({ id: cashierShifts.id })
      .from(cashierShifts)
      .where(
        and(
          eq(cashierShifts.tenantId, tenantId),
          eq(cashierShifts.cashierId, cashierId),
          eq(cashierShifts.status, 'OPEN')
        )
      )
      .limit(1);

    if (existingOpen) {
      throw new Error(`Shift #${existingOpen.id} is already open for this cashier. Close the current session first.`);
    }

    // 2. Open Cashier Shift
    const [shift] = await tx
      .insert(cashierShifts)
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
        .insert(drawerSessions)
        .values({
          tenantId,
          drawerId: input.cashDrawerId,
          cashierId,
          openingFloat: String(input.openingFloat),
          expectedClosingBalance: String(input.openingFloat),
          status: 'OPEN',
        });

      await tx
        .update(cashDrawers)
        .set({ status: 'OPEN', currentBalance: String(input.openingFloat) })
        .where(eq(cashDrawers.id, input.cashDrawerId));
    }

    return shift;
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

    // Calculate actual cash collected during this shift period
    const [cashTendered] = await tx
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
      );

    const cashSales = Number(cashTendered?.totalCash || 0);
    const expectedCash = Number(shift.openingFloat) + cashSales;
    const countedCash = input.countedCash;
    const variance = Math.round((countedCash - expectedCash) * 100) / 100;

    // Update shift record to CLOSED
    const [closed] = await tx
      .update(cashierShifts)
      .set({
        expectedCash: String(expectedCash),
        countedCash: String(countedCash),
        variance: String(variance),
        status: 'CLOSED',
        closedByUserId: supervisorId,
        varianceNotes: input.varianceNotes || (variance === 0 ? 'Balanced shift settlement' : null),
        closedAt: new Date(),
      })
      .where(eq(cashierShifts.id, shift.id))
      .returning();

    // Workday/SAP Paradigm: Automated Variance Escalation Trigger
    // If variance exceeds tolerance (> KES 500), dispatch notification & trigger rule
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
        actionUrl: '/cash-management/shifts',
        isRead: false,
        isResolved: false,
      });
    }

    return closed;
  });
};