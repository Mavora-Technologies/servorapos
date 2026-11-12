import { eq, and, desc, sql, or, isNull } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  supplierInvoices,
  expenses,
  cashDrawers,
  drawerSessions,
  financialAdjustments,
  cashierShifts,
  payments,
  branches,
} from '../config/schema';
import { FinanceHubQuery } from '../validators/finance-hub.validator';

export const getExecutiveFinanceOverview = async (tenantId: number, query: FinanceHubQuery) => {
  const branchCondition = query.branchId ? eq(orders.branchId, query.branchId) : undefined;
  const supplierBranchCondition = query.branchId ? eq(supplierInvoices.branchId, query.branchId) : undefined;
  const expenseBranchCondition = query.branchId ? eq(expenses.branchId, query.branchId) : undefined;
  const drawerBranchCondition = query.branchId ? eq(cashDrawers.branchId, query.branchId) : undefined;
  const adjBranchCondition = query.branchId ? eq(financialAdjustments.branchId, query.branchId) : undefined;
  const shiftBranchCondition = query.branchId ? eq(cashierShifts.branchId, query.branchId) : undefined;

  // Determine date intervals
  let dateFilterOrders = sql`true`;
  let dateFilterSupplier = sql`true`;
  let dateFilterExpenses = sql`true`;

  if (query.period === 'TODAY') {
    dateFilterOrders = sql`date(${orders.createdAt}) = current_date`;
    dateFilterSupplier = sql`date(${supplierInvoices.invoiceDate}) = current_date`;
    dateFilterExpenses = sql`date(${expenses.expenseDate}) = current_date`;
  } else if (query.period === 'THIS_MONTH') {
    dateFilterOrders = sql`date_trunc('month', ${orders.createdAt}) = date_trunc('month', current_date)`;
    dateFilterSupplier = sql`date_trunc('month', ${supplierInvoices.invoiceDate}) = date_trunc('month', current_date)`;
    dateFilterExpenses = sql`date_trunc('month', ${expenses.expenseDate}) = date_trunc('month', current_date)`;
  } else if (query.period === 'THIS_QUARTER') {
    dateFilterOrders = sql`date_trunc('quarter', ${orders.createdAt}) = date_trunc('quarter', current_date)`;
    dateFilterSupplier = sql`date_trunc('quarter', ${supplierInvoices.invoiceDate}) = date_trunc('quarter', current_date)`;
    dateFilterExpenses = sql`date_trunc('quarter', ${expenses.expenseDate}) = date_trunc('quarter', current_date)`;
  } else if (query.period === 'THIS_YEAR') {
    dateFilterOrders = sql`date_trunc('year', ${orders.createdAt}) = date_trunc('year', current_date)`;
    dateFilterSupplier = sql`date_trunc('year', ${supplierInvoices.invoiceDate}) = date_trunc('year', current_date)`;
    dateFilterExpenses = sql`date_trunc('year', ${expenses.expenseDate}) = date_trunc('year', current_date)`;
  }

  const paidOrderCondition = sql`UPPER(${orders.status}) != 'CANCELLED' AND UPPER(${orders.paymentStatus}) IN ('PAID', 'PARTIAL')`;

  const [
    [salesResult],
    [billsResult],
    [expensesResult],
    [liquidityResult],
    [adjustmentsResult],
    [pendingGovernanceResult],
  ] = await Promise.all([
    // 1. Gross Revenue & Output Tax Liability
    db
      .select({
        totalRevenue: sql<number>`coalesce(sum(case when ${paidOrderCondition} then ${orders.total} else 0 end), 0)::numeric`,
        grossTaxableSales: sql<number>`coalesce(sum(case when ${paidOrderCondition} then ${orders.subtotal} else 0 end), 0)::numeric`,
        outputVat: sql<number>`coalesce(sum(case when ${paidOrderCondition} then ${orders.tax} else 0 end), 0)::numeric`,
        cateringLevy: sql<number>`coalesce(sum(case when ${paidOrderCondition} then ${orders.cateringLevy} else 0 end), 0)::numeric`,
        settledOrdersCount: sql<number>`count(case when ${paidOrderCondition} then 1 end)::int`,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), branchCondition, dateFilterOrders)),

    // 2. Vendor AP Obligations & Input Tax Credits
    db
      .select({
        totalInvoicedBills: sql<number>`coalesce(sum(${supplierInvoices.totalAmount}), 0)::numeric`,
        totalPaidBills: sql<number>`coalesce(sum(${supplierInvoices.paidAmount}), 0)::numeric`,
        outstandingPayables: sql<number>`coalesce(sum(case when ${supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID', 'DISPUTED') then (${supplierInvoices.totalAmount} - ${supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
        inputVat: sql<number>`coalesce(sum(${supplierInvoices.taxAmount}), 0)::numeric`,
      })
      .from(supplierInvoices)
      .where(and(eq(supplierInvoices.tenantId, tenantId), supplierBranchCondition, dateFilterSupplier)),

    // 3. Operational Expenses & Reimbursements
    db
      .select({
        totalDisbursedExpenses: sql<number>`coalesce(sum(case when ${expenses.status} = 'PAID_DISBURSED' then ${expenses.totalAmount} else 0 end), 0)::numeric`,
        pendingApprovalExpenses: sql<number>`coalesce(sum(case when ${expenses.status} = 'SUBMITTED' then ${expenses.totalAmount} else 0 end), 0)::numeric`,
        pendingCount: sql<number>`count(case when ${expenses.status} = 'SUBMITTED' then 1 end)::int`,
      })
      .from(expenses)
      .where(and(eq(expenses.tenantId, tenantId), expenseBranchCondition, dateFilterExpenses)),

    // 4. Live Treasury Balances across Active Drawers
    db
      .select({
        totalDrawerCash: sql<number>`coalesce(sum(${cashDrawers.currentBalance}), 0)::numeric`,
        activeDrawersCount: sql<number>`count(case when ${cashDrawers.status} = 'OPEN' then 1 end)::int`,
      })
      .from(cashDrawers)
      .where(and(eq(cashDrawers.tenantId, tenantId), drawerBranchCondition)),

    // 5. General Ledger Adjustments & Write-offs
    db
      .select({
        postedAdjustmentsKes: sql<number>`coalesce(sum(case when ${financialAdjustments.status} = 'POSTED' then ${financialAdjustments.amount} else 0 end), 0)::numeric`,
        pendingAdjustmentVouchers: sql<number>`count(case when ${financialAdjustments.status} = 'PENDING_APPROVAL' then 1 end)::int`,
      })
      .from(financialAdjustments)
      .where(and(eq(financialAdjustments.tenantId, tenantId), adjBranchCondition)),

    // 6. Actionable Fiduciary Governance Queue
    db
      .select({
        openTillShifts: sql<number>`count(case when ${cashierShifts.status} = 'OPEN' then 1 end)::int`,
        unbalancedClosedShifts: sql<number>`count(case when ${cashierShifts.status} = 'CLOSED' and coalesce(${cashierShifts.variance}, 0) != 0 then 1 end)::int`,
      })
      .from(cashierShifts)
      .where(and(eq(cashierShifts.tenantId, tenantId), shiftBranchCondition)),
  ]);

  const totalRevenue = Number(salesResult?.totalRevenue || 0);
  const totalBills = Number(billsResult?.totalPaidBills || 0);
  const totalExpenses = Number(expensesResult?.totalDisbursedExpenses || 0);
  const outputVat = Number(salesResult?.outputVat || 0);
  const inputVat = Number(billsResult?.inputVat || 0);
  const netVatPayable = Math.round((outputVat - inputVat) * 100) / 100;
  const netOperatingMargin = totalRevenue - (totalBills + totalExpenses);

  return {
    period: query.period,
    financialSummary: {
      totalRevenueKes: totalRevenue,
      totalCostOutflowKes: totalBills + totalExpenses,
      netOperatingMarginKes: netOperatingMargin,
      marginPercentage: totalRevenue > 0 ? Math.round((netOperatingMargin / totalRevenue) * 1000) / 10 : 0,
      settledOrdersCount: Number(salesResult?.settledOrdersCount || 0),
    },
    treasuryLiquidity: {
      cashDrawerFloatKes: Number(liquidityResult?.totalDrawerCash || 0),
      activeDrawersCount: Number(liquidityResult?.activeDrawersCount || 0),
      outstandingPayablesKes: Number(billsResult?.outstandingPayables || 0),
      pendingClaimsKes: Number(expensesResult?.pendingApprovalExpenses || 0),
    },
    statutoryTaxOverview: {
      outputVatKes: outputVat,
      inputVatCreditsKes: inputVat,
      netVatPayableKes: netVatPayable,
      cateringLevyKes: Number(salesResult?.cateringLevy || 0),
      isRefundableCredit: netVatPayable < 0,
    },
    governanceQueue: {
      pendingExpenseClaims: Number(expensesResult?.pendingCount || 0),
      pendingAdjustments: Number(adjustmentsResult?.pendingAdjustmentVouchers || 0),
      activeTillShifts: Number(pendingGovernanceResult?.openTillShifts || 0),
      unbalancedShifts: Number(pendingGovernanceResult?.unbalancedClosedShifts || 0),
    },
  };
};

export const getRecentTreasuryLedger = async (
  tenantId: number,
  branchId?: number,
  limit = 15
) => {
  const recentPayments = await db
    .select({
      id: payments.id,
      paymentNumber: payments.paymentNumber,
      paymentFlow: payments.paymentFlow,
      status: payments.status,
      paymentMethod: payments.paymentMethod,
      clearingAccount: payments.clearingAccount,
      transactionReference: payments.transactionReference,
      amount: payments.amount,
      branchName: branches.name,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(branches, eq(payments.branchId, branches.id))
    .where(
      and(
        eq(payments.tenantId, tenantId),
        branchId ? eq(payments.branchId, branchId) : undefined
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(limit);

  return recentPayments.map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));
};