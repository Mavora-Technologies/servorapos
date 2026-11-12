"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentTreasuryLedger = exports.getExecutiveFinanceOverview = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getExecutiveFinanceOverview = async (tenantId, query) => {
    const branchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined;
    const supplierBranchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.supplierInvoices.branchId, query.branchId) : undefined;
    const expenseBranchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.expenses.branchId, query.branchId) : undefined;
    const drawerBranchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.cashDrawers.branchId, query.branchId) : undefined;
    const adjBranchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.financialAdjustments.branchId, query.branchId) : undefined;
    const shiftBranchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, query.branchId) : undefined;
    // Determine date intervals
    let dateFilterOrders = (0, drizzle_orm_1.sql) `true`;
    let dateFilterSupplier = (0, drizzle_orm_1.sql) `true`;
    let dateFilterExpenses = (0, drizzle_orm_1.sql) `true`;
    if (query.period === 'TODAY') {
        dateFilterOrders = (0, drizzle_orm_1.sql) `date(${schema_1.orders.createdAt}) = current_date`;
        dateFilterSupplier = (0, drizzle_orm_1.sql) `date(${schema_1.supplierInvoices.invoiceDate}) = current_date`;
        dateFilterExpenses = (0, drizzle_orm_1.sql) `date(${schema_1.expenses.expenseDate}) = current_date`;
    }
    else if (query.period === 'THIS_MONTH') {
        dateFilterOrders = (0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.orders.createdAt}) = date_trunc('month', current_date)`;
        dateFilterSupplier = (0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.supplierInvoices.invoiceDate}) = date_trunc('month', current_date)`;
        dateFilterExpenses = (0, drizzle_orm_1.sql) `date_trunc('month', ${schema_1.expenses.expenseDate}) = date_trunc('month', current_date)`;
    }
    else if (query.period === 'THIS_QUARTER') {
        dateFilterOrders = (0, drizzle_orm_1.sql) `date_trunc('quarter', ${schema_1.orders.createdAt}) = date_trunc('quarter', current_date)`;
        dateFilterSupplier = (0, drizzle_orm_1.sql) `date_trunc('quarter', ${schema_1.supplierInvoices.invoiceDate}) = date_trunc('quarter', current_date)`;
        dateFilterExpenses = (0, drizzle_orm_1.sql) `date_trunc('quarter', ${schema_1.expenses.expenseDate}) = date_trunc('quarter', current_date)`;
    }
    else if (query.period === 'THIS_YEAR') {
        dateFilterOrders = (0, drizzle_orm_1.sql) `date_trunc('year', ${schema_1.orders.createdAt}) = date_trunc('year', current_date)`;
        dateFilterSupplier = (0, drizzle_orm_1.sql) `date_trunc('year', ${schema_1.supplierInvoices.invoiceDate}) = date_trunc('year', current_date)`;
        dateFilterExpenses = (0, drizzle_orm_1.sql) `date_trunc('year', ${schema_1.expenses.expenseDate}) = date_trunc('year', current_date)`;
    }
    const paidOrderCondition = (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.status}) != 'CANCELLED' AND UPPER(${schema_1.orders.paymentStatus}) IN ('PAID', 'PARTIAL')`;
    const [[salesResult], [billsResult], [expensesResult], [liquidityResult], [adjustmentsResult], [pendingGovernanceResult],] = await Promise.all([
        // 1. Gross Revenue & Output Tax Liability
        db_1.db
            .select({
            totalRevenue: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${paidOrderCondition} then ${schema_1.orders.total} else 0 end), 0)::numeric`,
            grossTaxableSales: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${paidOrderCondition} then ${schema_1.orders.subtotal} else 0 end), 0)::numeric`,
            outputVat: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${paidOrderCondition} then ${schema_1.orders.tax} else 0 end), 0)::numeric`,
            cateringLevy: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${paidOrderCondition} then ${schema_1.orders.cateringLevy} else 0 end), 0)::numeric`,
            settledOrdersCount: (0, drizzle_orm_1.sql) `count(case when ${paidOrderCondition} then 1 end)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchCondition, dateFilterOrders)),
        // 2. Vendor AP Obligations & Input Tax Credits
        db_1.db
            .select({
            totalInvoicedBills: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.totalAmount}), 0)::numeric`,
            totalPaidBills: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.paidAmount}), 0)::numeric`,
            outstandingPayables: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.supplierInvoices.status} in ('UNPAID', 'PARTIALLY_PAID', 'DISPUTED') then (${schema_1.supplierInvoices.totalAmount} - ${schema_1.supplierInvoices.paidAmount}) else 0 end), 0)::numeric`,
            inputVat: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.supplierInvoices.taxAmount}), 0)::numeric`,
        })
            .from(schema_1.supplierInvoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.supplierInvoices.tenantId, tenantId), supplierBranchCondition, dateFilterSupplier)),
        // 3. Operational Expenses & Reimbursements
        db_1.db
            .select({
            totalDisbursedExpenses: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.expenses.status} = 'PAID_DISBURSED' then ${schema_1.expenses.totalAmount} else 0 end), 0)::numeric`,
            pendingApprovalExpenses: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.expenses.status} = 'SUBMITTED' then ${schema_1.expenses.totalAmount} else 0 end), 0)::numeric`,
            pendingCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.expenses.status} = 'SUBMITTED' then 1 end)::int`,
        })
            .from(schema_1.expenses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.expenses.tenantId, tenantId), expenseBranchCondition, dateFilterExpenses)),
        // 4. Live Treasury Balances across Active Drawers
        db_1.db
            .select({
            totalDrawerCash: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.cashDrawers.currentBalance}), 0)::numeric`,
            activeDrawersCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashDrawers.status} = 'OPEN' then 1 end)::int`,
        })
            .from(schema_1.cashDrawers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashDrawers.tenantId, tenantId), drawerBranchCondition)),
        // 5. General Ledger Adjustments & Write-offs
        db_1.db
            .select({
            postedAdjustmentsKes: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.financialAdjustments.status} = 'POSTED' then ${schema_1.financialAdjustments.amount} else 0 end), 0)::numeric`,
            pendingAdjustmentVouchers: (0, drizzle_orm_1.sql) `count(case when ${schema_1.financialAdjustments.status} = 'PENDING_APPROVAL' then 1 end)::int`,
        })
            .from(schema_1.financialAdjustments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.financialAdjustments.tenantId, tenantId), adjBranchCondition)),
        // 6. Actionable Fiduciary Governance Queue
        db_1.db
            .select({
            openTillShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'OPEN' then 1 end)::int`,
            unbalancedClosedShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'CLOSED' and coalesce(${schema_1.cashierShifts.variance}, 0) != 0 then 1 end)::int`,
        })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), shiftBranchCondition)),
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
exports.getExecutiveFinanceOverview = getExecutiveFinanceOverview;
const getRecentTreasuryLedger = async (tenantId, branchId, limit = 15) => {
    const recentPayments = await db_1.db
        .select({
        id: schema_1.payments.id,
        paymentNumber: schema_1.payments.paymentNumber,
        paymentFlow: schema_1.payments.paymentFlow,
        status: schema_1.payments.status,
        paymentMethod: schema_1.payments.paymentMethod,
        clearingAccount: schema_1.payments.clearingAccount,
        transactionReference: schema_1.payments.transactionReference,
        amount: schema_1.payments.amount,
        branchName: schema_1.branches.name,
        createdAt: schema_1.payments.createdAt,
    })
        .from(schema_1.payments)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.payments.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.payments.branchId, branchId) : undefined))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))
        .limit(limit);
    return recentPayments.map((p) => ({
        ...p,
        amount: Number(p.amount),
    }));
};
exports.getRecentTreasuryLedger = getRecentTreasuryLedger;
