import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  payments,
  orders,
  suppliers,
  users,
  branches,
} from '../config/schema';
import { PaymentReportQuery } from '../validators/payment-report.validator';

const parseDateRange = (startDateStr?: string, endDateStr?: string) => {
  let start: Date;
  if (startDateStr) {
    start = new Date(startDateStr);
    if (!startDateStr.includes('T')) {
      start.setHours(0, 0, 0, 0);
    }
  } else {
    start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
  }

  let end: Date;
  if (endDateStr) {
    end = new Date(endDateStr);
    if (!endDateStr.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getPaymentReportMetrics = async (tenantId: number, query: PaymentReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  const baseConditions = [
    eq(payments.tenantId, tenantId),
    gte(payments.createdAt, start),
    lte(payments.createdAt, end),
    query.branchId ? eq(payments.branchId, query.branchId) : undefined,
    query.paymentFlow && query.paymentFlow !== 'ALL' ? eq(payments.paymentFlow, query.paymentFlow) : undefined,
    query.paymentMethod && query.paymentMethod !== 'ALL' ? eq(payments.paymentMethod, query.paymentMethod) : undefined,
    query.clearingAccount && query.clearingAccount !== 'ALL' ? eq(payments.clearingAccount, query.clearingAccount) : undefined,
    query.status && query.status !== 'ALL' ? eq(payments.status, query.status) : undefined,
    query.search
      ? or(
          ilike(payments.paymentNumber, `%${query.search}%`),
          ilike(payments.transactionReference, `%${query.search}%`),
          ilike(payments.clearingAccount, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  // 1. Executive Treasury KPI Totals
  const [metrics] = await db
    .select({
      totalTransactions: sql<number>`count(*)`,
      totalInflowAR: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'INBOUND_AR' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      totalOutflowAP: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'OUTBOUND_AP' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      reconciledAmount: sql<number>`coalesce(sum(case when ${payments.status} = 'RECONCILED' then ${payments.amount} else 0 end), 0)::numeric`,
      unreconciledAmount: sql<number>`coalesce(sum(case when ${payments.status} = 'POSTED' then ${payments.amount} else 0 end), 0)::numeric`,
      bouncedReversedAmount: sql<number>`coalesce(sum(case when ${payments.status} in ('CANCELLED_REVERSED', 'BOUNCED') then ${payments.amount} else 0 end), 0)::numeric`,
      bouncedReversedCount: sql<number>`count(case when ${payments.status} in ('CANCELLED_REVERSED', 'BOUNCED') then 1 end)`,
    })
    .from(payments)
    .where(and(...baseConditions));

  const totalInflow = Number(metrics?.totalInflowAR || 0);
  const totalOutflow = Number(metrics?.totalOutflowAP || 0);
  const netCashFlow = totalInflow - totalOutflow;
  const reconciledAmt = Number(metrics?.reconciledAmount || 0);
  const totalVolume = totalInflow + totalOutflow;
  const reconciliationRatePercent = totalVolume > 0 ? Math.round((reconciledAmt / totalVolume) * 100) : 100;

  // 2. Treasury Clearing Account Distribution
  const clearingAccounts = await db
    .select({
      accountName: payments.clearingAccount,
      transactionCount: sql<number>`count(*)`,
      inflow: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'INBOUND_AR' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      outflow: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'OUTBOUND_AP' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      netBalance: sql<number>`coalesce(sum(case when ${payments.status} in ('POSTED', 'RECONCILED') then (case when ${payments.paymentFlow} = 'INBOUND_AR' then ${payments.amount} else -${payments.amount} end) else 0 end), 0)::numeric`,
    })
    .from(payments)
    .where(and(...baseConditions))
    .groupBy(payments.clearingAccount)
    .orderBy(desc(sql`sum(${payments.amount})`));

  // 3. Payment Method Matrix
  const tenderBreakdown = await db
    .select({
      paymentMethod: payments.paymentMethod,
      transactionCount: sql<number>`count(*)`,
      totalCollected: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'INBOUND_AR' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      totalDisbursed: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'OUTBOUND_AP' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
    })
    .from(payments)
    .where(and(...baseConditions))
    .groupBy(payments.paymentMethod)
    .orderBy(desc(sql`sum(${payments.amount})`));

  // 4. Cash Flow Velocity Timeline (Inflow vs. Outflow)
  const timeBucketSql = query.interval === 'HOUR'
    ? sql<string>`to_char(${payments.createdAt}, 'YYYY-MM-DD HH24:00')`
    : sql<string>`to_char(${payments.createdAt}, 'YYYY-MM-DD')`;

  const timeline = await db
    .select({
      timeBucket: timeBucketSql,
      inflow: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'INBOUND_AR' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      outflow: sql<number>`coalesce(sum(case when ${payments.paymentFlow} = 'OUTBOUND_AP' and ${payments.status} in ('POSTED', 'RECONCILED') then ${payments.amount} else 0 end), 0)::numeric`,
      netCash: sql<number>`coalesce(sum(case when ${payments.status} in ('POSTED', 'RECONCILED') then (case when ${payments.paymentFlow} = 'INBOUND_AR' then ${payments.amount} else -${payments.amount} end) else 0 end), 0)::numeric`,
      transactionCount: sql<number>`count(*)`,
    })
    .from(payments)
    .where(and(...baseConditions))
    .groupBy(timeBucketSql)
    .orderBy(asc(timeBucketSql));

  // 5. Paginated Detailed Transaction Ledger
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const [countResult, ledgerTransactions] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(and(...baseConditions)),
    db
      .select({
        id: payments.id,
        paymentNumber: payments.paymentNumber,
        paymentFlow: payments.paymentFlow,
        status: payments.status,
        paymentMethod: payments.paymentMethod,
        clearingAccount: payments.clearingAccount,
        transactionReference: payments.transactionReference,
        amount: payments.amount,
        currency: payments.currency,
        orderId: payments.orderId,
        orderNumber: orders.orderNumber,
        supplierId: payments.supplierId,
        supplierName: suppliers.name,
        branchId: payments.branchId,
        branchName: branches.name,
        processedByName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        isReversed: payments.isReversed,
        reconciledAt: payments.reconciledAt,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(orders, eq(payments.orderId, orders.id))
      .leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
      .leftJoin(branches, eq(payments.branchId, branches.id))
      .leftJoin(users, eq(payments.processedById, users.id))
      .where(and(...baseConditions))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const totalTransactions = Number(countResult[0]?.count || 0);

  return {
    summary: {
      totalTransactions: Number(metrics?.totalTransactions || 0),
      totalInflowAR: totalInflow,
      totalOutflowAP: totalOutflow,
      netCashFlow,
      reconciledAmount: reconciledAmt,
      unreconciledAmount: Number(metrics?.unreconciledAmount || 0),
      bouncedReversedAmount: Number(metrics?.bouncedReversedAmount || 0),
      bouncedReversedCount: Number(metrics?.bouncedReversedCount || 0),
      reconciliationRatePercent,
    },
    clearingAccounts: clearingAccounts.map((c) => ({
      accountName: c.accountName,
      transactionCount: Number(c.transactionCount),
      inflow: Number(c.inflow),
      outflow: Number(c.outflow),
      netBalance: Number(c.netBalance),
    })),
    tenderBreakdown: tenderBreakdown.map((t) => ({
      paymentMethod: t.paymentMethod,
      transactionCount: Number(t.transactionCount),
      totalCollected: Number(t.totalCollected),
      totalDisbursed: Number(t.totalDisbursed),
    })),
    timeline: timeline.map((t) => ({
      timeBucket: t.timeBucket,
      inflow: Number(t.inflow),
      outflow: Number(t.outflow),
      netCash: Number(t.netCash),
      transactionCount: Number(t.transactionCount),
    })),
    ledger: ledgerTransactions.map((tx) => ({
      id: tx.id,
      paymentNumber: tx.paymentNumber,
      paymentFlow: tx.paymentFlow,
      status: tx.status,
      paymentMethod: tx.paymentMethod,
      clearingAccount: tx.clearingAccount,
      transactionReference: tx.transactionReference || 'N/A',
      amount: Number(tx.amount),
      currency: tx.currency,
      partyIdentifier: tx.orderNumber ? `Order #${tx.orderNumber}` : tx.supplierName ? `Vendor: ${tx.supplierName}` : 'Treasury Direct',
      branchName: tx.branchName || 'Tenant-Wide',
      processedByName: tx.processedByName || 'System',
      isReversed: tx.isReversed,
      isReconciled: tx.status === 'RECONCILED',
      createdAt: tx.createdAt,
    })),
    pagination: {
      page,
      limit,
      total: totalTransactions,
      totalPages: Math.ceil(totalTransactions / limit) || 1,
    },
  };
};

export const getExportablePaymentReport = async (tenantId: number, query: PaymentReportQuery) => {
  return await getPaymentReportMetrics(tenantId, { ...query, limit: 2000, page: 1 });
};