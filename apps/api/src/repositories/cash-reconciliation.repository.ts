import { eq, and, desc, asc, sql, or, isNull, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  cashierShifts,
  drawerSessions,
  payments,
  mpesaTransactions,
  users,
  branches,
  notifications,
} from '../config/schema';
import {
  ReconciliationQuery,
  PerformReconciliationAuditInput,
} from '../validators/cash-reconciliation.validator';

export const getReconciliationDailyTelemetry = async (
  tenantId: number,
  branchId?: number,
  dateStr?: string
) => {
  const targetDateSql = dateStr
    ? sql`date(${cashierShifts.openedAt}) = ${dateStr}::date`
    : sql`date(${cashierShifts.openedAt}) = current_date`;

  const branchCondition = branchId ? eq(cashierShifts.branchId, branchId) : undefined;
  const paymentBranchCondition = branchId ? eq(payments.branchId, branchId) : undefined;
  const mpesaBranchCondition = branchId ? eq(mpesaTransactions.branchId, branchId) : undefined;

  // 1. Aggregate Closed Shift Fiduciary Data
  const [shiftSummary] = await db
    .select({
      totalClosedShifts: sql<number>`count(case when ${cashierShifts.status} = 'CLOSED' then 1 end)::int`,
      pendingOpenShifts: sql<number>`count(case when ${cashierShifts.status} = 'OPEN' then 1 end)::int`,
      totalExpectedCash: sql<number>`coalesce(sum(case when ${cashierShifts.status} = 'CLOSED' then coalesce(${cashierShifts.expectedCash}, 0) else 0 end), 0)::numeric`,
      totalCountedCash: sql<number>`coalesce(sum(case when ${cashierShifts.status} = 'CLOSED' then coalesce(${cashierShifts.countedCash}, 0) else 0 end), 0)::numeric`,
      netCashVariance: sql<number>`coalesce(sum(case when ${cashierShifts.status} = 'CLOSED' then coalesce(${cashierShifts.variance}, 0) else 0 end), 0)::numeric`,
    })
    .from(cashierShifts)
    .where(and(eq(cashierShifts.tenantId, tenantId), branchCondition, targetDateSql));

  // 2. Aggregate Multi-Tender Reconciliation (M-Pesa, Card, Cash)
  const paymentDateSql = dateStr
    ? sql`date(${payments.createdAt}) = ${dateStr}::date`
    : sql`date(${payments.createdAt}) = current_date`;

  const [paymentTenders] = await db
    .select({
      cardTotal: sql<number>`coalesce(sum(case when ${payments.paymentMethod} = 'CREDIT_CARD' and ${payments.status} = 'POSTED' then ${payments.amount} else 0 end), 0)::numeric`,
      bankTransferTotal: sql<number>`coalesce(sum(case when ${payments.paymentMethod} = 'BANK_TRANSFER' and ${payments.status} = 'POSTED' then ${payments.amount} else 0 end), 0)::numeric`,
    })
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), paymentBranchCondition, paymentDateSql));

  // 3. Aggregate Cleared M-Pesa IPN Webhook Volume
  const mpesaDateSql = dateStr
    ? sql`date(${mpesaTransactions.transactionDate}) = ${dateStr}::date`
    : sql`date(${mpesaTransactions.transactionDate}) = current_date`;

  const [mpesaStats] = await db
    .select({
      totalMpesaCleared: sql<number>`coalesce(sum(case when ${mpesaTransactions.status} = 'COMPLETED' then ${mpesaTransactions.amount} else 0 end), 0)::numeric`,
      mpesaTransactionCount: sql<number>`count(case when ${mpesaTransactions.status} = 'COMPLETED' then 1 end)::int`,
    })
    .from(mpesaTransactions)
    .where(and(eq(mpesaTransactions.tenantId, tenantId), mpesaBranchCondition, mpesaDateSql));

  return {
    targetDate: dateStr || new Date().toISOString().split('T')[0],
    shiftCounts: {
      closedReconciled: Number(shiftSummary?.totalClosedShifts || 0),
      pendingActive: Number(shiftSummary?.pendingOpenShifts || 0),
    },
    cashReconciliation: {
      expectedDrawerCashKes: Number(shiftSummary?.totalExpectedCash || 0),
      actualPhysicalCashKes: Number(shiftSummary?.totalCountedCash || 0),
      netVarianceKes: Number(shiftSummary?.netCashVariance || 0),
    },
    multiTenderBreakdown: {
      mpesaClearedKes: Number(mpesaStats?.totalMpesaCleared || 0),
      mpesaVolumeCount: Number(mpesaStats?.mpesaTransactionCount || 0),
      cardTerminalKes: Number(paymentTenders?.cardTotal || 0),
      bankTransferKes: Number(paymentTenders?.bankTransferTotal || 0),
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
      ? and(eq(cashierShifts.status, 'CLOSED'), eq(cashierShifts.variance, '0.00'))
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

  return {
    records: rows.map((r) => ({
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
      `[Audit Resolution - ${input.auditResolution}] Deposited: KES ${input.actualDepositAmount.toLocaleString()} to ${input.clearingAccountId}. Notes: ${input.auditorNotes || 'No additional commentary'}`,
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

    // If escalated or severe variance, notify executive controllers
    if (input.auditResolution === 'DISPUTED_ESCALATED') {
      await tx.insert(notifications).values({
        tenantId,
        branchId: shift.branchId,
        title: `Supervisor Discrepancy Escalation: Shift #${shift.id}`,
        detail: `Supervisor flagged shift reconciliation dispute for cashier #${shift.cashierId}. Deposited: KES ${input.actualDepositAmount}. Reason: ${input.auditorNotes || 'Audit investigation requested'}`,
        severity: 'CRITICAL',
        module: 'FINANCE',
        category: 'COMPLIANCE_AUDIT',
        entityType: 'cashier_shifts',
        entityId: String(shift.id),
        actionUrl: '/cash-management/reconciliation',
        isRead: false,
        isResolved: false,
      });
    }

    return updated;
  });
};