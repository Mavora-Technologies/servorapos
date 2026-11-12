import { eq, and, desc, sql, or, isNull, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashierShifts,
  drawerSessions,
  cashDrawers,
  orders,
  payments,
  mpesaTransactions,
  users,
  branches,
  notifications,
  auditLogs,
  financialAdjustments,
} from '../config/schema';
import {
  ReconciliationQuery,
  PerformReconciliationAuditInput,
} from '../validators/cash-reconciliation.validator';

// Helper to compute live POS sales & drawer session details for any shift
async function enrichShiftForReconciliation(
  tenantId: number,
  shift: {
    shiftId: number;
    branchId: number | null;
    branchName: string | null;
    cashierId: number;
    cashierName: string;
    openingFloat: string | number;
    expectedCash: string | number;
    countedCash: string | number | null;
    variance: string | number | null;
    status: string;
    varianceNotes: string | null;
    openedAt: Date;
    closedAt: Date | null;
    supervisorName: string | null;
  }
) {
  const openingFloat = Number(shift.openingFloat) || 0;

  const [linkedSession] = await db
    .select({
      id: drawerSessions.id,
      drawerId: drawerSessions.drawerId,
      drawerName: cashDrawers.name,
      drawerCode: cashDrawers.drawerCode,
      cashSalesTotal: drawerSessions.cashSalesTotal,
      cashDropsTotal: drawerSessions.cashDropsTotal,
      payoutsTotal: drawerSessions.payoutsTotal,
      denominations: drawerSessions.denominations,
    })
    .from(drawerSessions)
    .innerJoin(cashDrawers, eq(drawerSessions.drawerId, cashDrawers.id))
    .where(
      and(
        eq(drawerSessions.tenantId, tenantId),
        eq(drawerSessions.cashierId, shift.cashierId),
        gte(drawerSessions.openedAt, new Date(shift.openedAt.getTime() - 60_000))
      )
    )
    .orderBy(desc(drawerSessions.openedAt))
    .limit(1);

  let posSalesDoneSoFar = 0;
  let liveExpectedCash = Number(shift.expectedCash) || 0;
  const safeDropsTotal = Number(linkedSession?.cashDropsTotal || 0);
  const payoutsTotal = Number(linkedSession?.payoutsTotal || 0);

  if (shift.status === 'OPEN') {
    const scopeFilter = or(
      eq(orders.cashierId, shift.cashierId),
      eq(orders.waiterId, shift.cashierId),
      and(
        isNull(orders.cashierId),
        shift.branchId ? eq(orders.branchId, shift.branchId) : sql`true`
      )
    );

    const [orderSalesAgg] = await db
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
          gte(orders.createdAt, shift.openedAt),
          scopeFilter
        )
      );

    posSalesDoneSoFar = Math.max(
      Number(linkedSession?.cashSalesTotal || 0),
      Number(orderSalesAgg?.totalFromOrders || 0)
    );

    liveExpectedCash = Math.max(
      0,
      openingFloat + posSalesDoneSoFar - safeDropsTotal - payoutsTotal
    );
  } else {
    posSalesDoneSoFar = Math.max(
      Number(linkedSession?.cashSalesTotal || 0),
      Math.max(0, liveExpectedCash + safeDropsTotal + payoutsTotal - openingFloat)
    );
  }

  return {
    ...shift,
    openingFloat,
    posSalesDoneSoFar,
    safeDropsTotal,
    payoutsTotal,
    expectedCash: liveExpectedCash,
    countedCash: shift.countedCash !== null ? Number(shift.countedCash) : null,
    variance: shift.variance !== null ? Number(shift.variance) : null,
    drawerName: linkedSession?.drawerName || null,
    drawerCode: linkedSession?.drawerCode || null,
    denominations: linkedSession?.denominations || null,
    isAuditSignedOff: Boolean(
      shift.varianceNotes && shift.varianceNotes.includes('[Audit Resolution -')
    ),
  };
}

export const getReconciliationDailyTelemetry = async (
  tenantId: number,
  branchId?: number,
  dateStr?: string
) => {
  const targetDateSql = dateStr
    ? sql`date(${cashierShifts.openedAt}) = ${dateStr}::date`
    : sql`date(${cashierShifts.openedAt}) = current_date`;

  const branchCondition = branchId ? eq(cashierShifts.branchId, branchId) : undefined;
  const orderBranchCondition = branchId ? eq(orders.branchId, branchId) : undefined;
  const paymentBranchCondition = branchId ? eq(payments.branchId, branchId) : undefined;
  const mpesaBranchCondition = branchId ? eq(mpesaTransactions.branchId, branchId) : undefined;

  // 1. Fetch all shifts for target date to compute live expected & closed totals accurately
  const dayShifts = await db
    .select({
      shiftId: cashierShifts.id,
      branchId: cashierShifts.branchId,
      branchName: branches.name,
      cashierId: cashierShifts.cashierId,
      cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      openingFloat: cashierShifts.openingFloat,
      expectedCash: cashierShifts.expectedCash,
      countedCash: cashierShifts.countedCash,
      variance: cashierShifts.variance,
      status: cashierShifts.status,
      varianceNotes: cashierShifts.varianceNotes,
      openedAt: cashierShifts.openedAt,
      closedAt: cashierShifts.closedAt,
      supervisorName: sql<string | null>`null`,
    })
    .from(cashierShifts)
    .leftJoin(branches, eq(cashierShifts.branchId, branches.id))
    .leftJoin(users, eq(cashierShifts.cashierId, users.id))
    .where(and(eq(cashierShifts.tenantId, tenantId), branchCondition, targetDateSql));

  const enrichedDayShifts = await Promise.all(
    dayShifts.map((s) => enrichShiftForReconciliation(tenantId, s))
  );

  let closedReconciled = 0;
  let pendingActive = 0;
  let expectedDrawerCashKes = 0;
  let actualPhysicalCashKes = 0;
  let netVarianceKes = 0;
  let totalPosCashSalesKes = 0;

  for (const s of enrichedDayShifts) {
    expectedDrawerCashKes += s.expectedCash;
    totalPosCashSalesKes += s.posSalesDoneSoFar;
    if (s.status === 'CLOSED') {
      closedReconciled += 1;
      actualPhysicalCashKes += s.countedCash ?? 0;
      netVarianceKes += s.variance ?? 0;
    } else {
      pendingActive += 1;
    }
  }

  // 2. Aggregate Multi-Tender Reconciliation across Payments, M-Pesa & POS Orders
  const paymentDateSql = dateStr
    ? sql`date(${payments.createdAt}) = ${dateStr}::date`
    : sql`date(${payments.createdAt}) = current_date`;

  const mpesaDateSql = dateStr
    ? sql`date(${mpesaTransactions.transactionDate}) = ${dateStr}::date`
    : sql`date(${mpesaTransactions.transactionDate}) = current_date`;

  const orderDateSql = dateStr
    ? sql`date(${orders.createdAt}) = ${dateStr}::date`
    : sql`date(${orders.createdAt}) = current_date`;

  const [[paymentTenders], [mpesaStats], [orderStats]] = await Promise.all([
    db
      .select({
        cardTotal: sql<number>`coalesce(sum(case when ${payments.paymentMethod} = 'CREDIT_CARD' and ${payments.isReversed} = false then ${payments.amount} else 0 end), 0)::numeric`,
        bankTransferTotal: sql<number>`coalesce(sum(case when ${payments.paymentMethod} = 'BANK_TRANSFER' and ${payments.isReversed} = false then ${payments.amount} else 0 end), 0)::numeric`,
        mpesaInboundTotal: sql<number>`coalesce(sum(case when ${payments.paymentMethod} = 'MPESA_B2B' and ${payments.paymentFlow} = 'INBOUND_AR' and ${payments.isReversed} = false then ${payments.amount} else 0 end), 0)::numeric`,
      })
      .from(payments)
      .where(and(eq(payments.tenantId, tenantId), paymentBranchCondition, paymentDateSql)),

    db
      .select({
        totalMpesaCleared: sql<number>`coalesce(sum(case when ${mpesaTransactions.status} = 'COMPLETED' then ${mpesaTransactions.amount} else 0 end), 0)::numeric`,
        mpesaTransactionCount: sql<number>`count(case when ${mpesaTransactions.status} = 'COMPLETED' then 1 end)::int`,
      })
      .from(mpesaTransactions)
      .where(and(eq(mpesaTransactions.tenantId, tenantId), mpesaBranchCondition, mpesaDateSql)),

    db
      .select({
        grossOrdersTotal: sql<number>`coalesce(sum(case when UPPER(${orders.status}) != 'CANCELLED' then ${orders.total} else 0 end), 0)::numeric`,
        ordersCount: sql<number>`count(case when UPPER(${orders.status}) != 'CANCELLED' then 1 end)::int`,
        taxCollected: sql<number>`coalesce(sum(case when UPPER(${orders.status}) != 'CANCELLED' then ${orders.tax} else 0 end), 0)::numeric`,
        levyCollected: sql<number>`coalesce(sum(case when UPPER(${orders.status}) != 'CANCELLED' then ${orders.cateringLevy} else 0 end), 0)::numeric`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), orderBranchCondition, orderDateSql)),
  ]);

  return {
    targetDate: dateStr || new Date().toISOString().split('T')[0],
    shiftCounts: {
      closedReconciled,
      pendingActive,
    },
    cashReconciliation: {
      expectedDrawerCashKes: Number(expectedDrawerCashKes.toFixed(2)),
      actualPhysicalCashKes: Number(actualPhysicalCashKes.toFixed(2)),
      netVarianceKes: Number(netVarianceKes.toFixed(2)),
      posCashSalesKes: Number(totalPosCashSalesKes.toFixed(2)),
    },
    multiTenderBreakdown: {
      mpesaClearedKes: Math.max(
        Number(mpesaStats?.totalMpesaCleared || 0),
        Number(paymentTenders?.mpesaInboundTotal || 0)
      ),
      mpesaVolumeCount: Number(mpesaStats?.mpesaTransactionCount || 0),
      cardTerminalKes: Number(paymentTenders?.cardTotal || 0),
      bankTransferKes: Number(paymentTenders?.bankTransferTotal || 0),
    },
    zReportSummary: {
      grossOrdersTotalKes: Number(orderStats?.grossOrdersTotal || 0),
      ordersCount: Number(orderStats?.ordersCount || 0),
      vatCollectedKes: Number(orderStats?.taxCollected || 0),
      cateringLevyKes: Number(orderStats?.levyCollected || 0),
    },
  };
};

export const listReconciliationAuditRecords = async (tenantId: number, query: ReconciliationQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const dateCondition = query.date
    ? sql`date(${cashierShifts.openedAt}) = ${query.date}::date`
    : undefined;

  const branchCondition = query.branchId ? eq(cashierShifts.branchId, query.branchId) : undefined;

  const statusCondition =
    query.status === 'BALANCED'
      ? and(eq(cashierShifts.status, 'CLOSED'), sql`coalesce(${cashierShifts.variance}, 0) = 0`)
      : query.status === 'DISCREPANCY'
        ? and(eq(cashierShifts.status, 'CLOSED'), sql`coalesce(${cashierShifts.variance}, 0) != 0`)
        : query.status === 'PENDING_AUDIT'
          ? eq(cashierShifts.status, 'OPEN')
          : undefined;

  const conditions = [
    eq(cashierShifts.tenantId, tenantId),
    branchCondition,
    dateCondition,
    statusCondition,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(cashierShifts)
      .where(and(...conditions)),
    db
      .select({
        shiftId: cashierShifts.id,
        branchId: cashierShifts.branchId,
        branchName: branches.name,
        cashierId: cashierShifts.cashierId,
        cashierName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        openingFloat: cashierShifts.openingFloat,
        expectedCash: cashierShifts.expectedCash,
        countedCash: cashierShifts.countedCash,
        variance: cashierShifts.variance,
        status: cashierShifts.status,
        varianceNotes: cashierShifts.varianceNotes,
        openedAt: cashierShifts.openedAt,
        closedAt: cashierShifts.closedAt,
        supervisorName: sql<string | null>`(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM users u WHERE u.id = ${cashierShifts.closedByUserId})`,
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
  const enrichedRecords = await Promise.all(
    rows.map((r) => enrichShiftForReconciliation(tenantId, r))
  );

  return {
    records: enrichedRecords,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const submitSupervisorAuditResolution = async (
  tenantId: number,
  supervisorId: number,
  input: PerformReconciliationAuditInput
) => {
  return await db.transaction(async (tx) => {
    const [shift] = await tx
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.id, input.shiftId), eq(cashierShifts.tenantId, tenantId)))
      .limit(1);

    if (!shift) throw new Error('Shift record not found');

    const updatedNote = [
      shift.varianceNotes,
      `[Audit Resolution - ${input.auditResolution}] Deposited: KES ${input.actualDepositAmount.toLocaleString()} to ${input.clearingAccountId}. Notes: ${input.auditorNotes || 'Verified'}`,
    ]
      .filter(Boolean)
      .join(' | ');

    const [updated] = await tx
      .update(cashierShifts)
      .set({
        varianceNotes: updatedNote,
        closedByUserId: supervisorId,
      })
      .where(eq(cashierShifts.id, shift.id))
      .returning();

    // 1. Write Immutable Audit Log
    await tx.insert(auditLogs).values({
      tenantId,
      branchId: shift.branchId,
      userId: supervisorId,
      action: 'Z_REPORT_SUPERVISOR_SIGN_OFF',
      module: 'FINANCE',
      entityType: 'cashier_shifts',
      entityId: String(shift.id),
      reason: `${input.auditResolution}: Deposited KES ${input.actualDepositAmount.toLocaleString()} to ${input.clearingAccountId}`,
      newValues: {
        shiftId: shift.id,
        auditResolution: input.auditResolution,
        actualDepositAmount: input.actualDepositAmount,
        clearingAccountId: input.clearingAccountId,
      },
    });

    // 2. If there is an unadjusted variance, create a Maker-Checker GL Adjustment Voucher
    const varianceNum = Number(shift.variance || 0);
    if (varianceNum !== 0) {
      const adjNumber = `ADJ-Z-${Date.now().toString().slice(-6)}`;
      const isShortage = varianceNum < 0;

      await tx.insert(financialAdjustments).values({
        tenantId,
        branchId: shift.branchId,
        adjustmentNumber: adjNumber,
        adjustmentType: 'TILL_VARIANCE_WRITE_OFF',
        shiftId: shift.id,
        attributedUserId: shift.cashierId,
        createdById: supervisorId,
        amount: Math.abs(varianceNum).toFixed(2),
        currency: 'KES',
        adjustmentDirection: isShortage ? 'DEBIT' : 'CREDIT',
        debitGlAccount: isShortage ? '5210 - Cash Over/Short Expense' : '1010 - Main Till Cash',
        creditGlAccount: isShortage ? '1010 - Main Till Cash' : '4910 - Cash Overage Income',
        status: 'PENDING_APPROVAL',
        reasonCode: 'DRAWER_DISCREPANCY',
        justificationNotes: `Z-Report EOD Sign-Off for Shift #${shift.id} (${input.auditResolution}). ${input.auditorNotes || ''}`.trim(),
      });
    }

    // 3. If escalated, dispatch critical compliance notification
    if (input.auditResolution === 'DISPUTED_ESCALATED') {
      await tx.insert(notifications).values({
        tenantId,
        branchId: shift.branchId,
        title: `Supervisor Discrepancy Escalation: Shift #${shift.id}`,
        detail: `Supervisor flagged shift reconciliation dispute for cashier #${shift.cashierId}. Deposited: KES ${input.actualDepositAmount.toLocaleString()}. Reason: ${input.auditorNotes || 'Audit investigation requested'}`,
        severity: 'CRITICAL',
        module: 'FINANCE',
        category: 'COMPLIANCE_AUDIT',
        entityType: 'cashier_shifts',
        entityId: String(shift.id),
        actionUrl: '/finance/adjustments',
        isRead: false,
        isResolved: false,
      });
    }

    return updated;
  });
};