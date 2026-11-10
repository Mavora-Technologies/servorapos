"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportablePaymentReport = exports.getPaymentReportMetrics = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const parseDateRange = (startDateStr, endDateStr) => {
    let start;
    if (startDateStr) {
        start = new Date(startDateStr);
        if (!startDateStr.includes('T')) {
            start.setHours(0, 0, 0, 0);
        }
    }
    else {
        start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        start.setHours(0, 0, 0, 0);
    }
    let end;
    if (endDateStr) {
        end = new Date(endDateStr);
        if (!endDateStr.includes('T')) {
            end.setHours(23, 59, 59, 999);
        }
    }
    else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};
const getPaymentReportMetrics = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    const baseConditions = [
        (0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.payments.createdAt, start),
        (0, drizzle_orm_1.lte)(schema_1.payments.createdAt, end),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.payments.branchId, query.branchId) : undefined,
        query.paymentFlow && query.paymentFlow !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.payments.paymentFlow, query.paymentFlow) : undefined,
        query.paymentMethod && query.paymentMethod !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.payments.paymentMethod, query.paymentMethod) : undefined,
        query.clearingAccount && query.clearingAccount !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.payments.clearingAccount, query.clearingAccount) : undefined,
        query.status && query.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.payments.status, query.status) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.payments.paymentNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.payments.transactionReference, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.payments.clearingAccount, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    // 1. Executive Treasury KPI Totals
    const [metrics] = await db_1.db
        .select({
        totalTransactions: (0, drizzle_orm_1.sql) `count(*)`,
        totalInflowAR: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'INBOUND_AR' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        totalOutflowAP: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'OUTBOUND_AP' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        reconciledAmount: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.status} = 'RECONCILED' then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        unreconciledAmount: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.status} = 'POSTED' then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        bouncedReversedAmount: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.status} in ('CANCELLED_REVERSED', 'BOUNCED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        bouncedReversedCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.payments.status} in ('CANCELLED_REVERSED', 'BOUNCED') then 1 end)`,
    })
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.and)(...baseConditions));
    const totalInflow = Number(metrics?.totalInflowAR || 0);
    const totalOutflow = Number(metrics?.totalOutflowAP || 0);
    const netCashFlow = totalInflow - totalOutflow;
    const reconciledAmt = Number(metrics?.reconciledAmount || 0);
    const totalVolume = totalInflow + totalOutflow;
    const reconciliationRatePercent = totalVolume > 0 ? Math.round((reconciledAmt / totalVolume) * 100) : 100;
    // 2. Treasury Clearing Account Distribution
    const clearingAccounts = await db_1.db
        .select({
        accountName: schema_1.payments.clearingAccount,
        transactionCount: (0, drizzle_orm_1.sql) `count(*)`,
        inflow: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'INBOUND_AR' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        outflow: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'OUTBOUND_AP' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        netBalance: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then (case when ${schema_1.payments.paymentFlow} = 'INBOUND_AR' then ${schema_1.payments.amount} else -${schema_1.payments.amount} end) else 0 end), 0)::numeric`,
    })
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.and)(...baseConditions))
        .groupBy(schema_1.payments.clearingAccount)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.payments.amount})`));
    // 3. Payment Method Matrix
    const tenderBreakdown = await db_1.db
        .select({
        paymentMethod: schema_1.payments.paymentMethod,
        transactionCount: (0, drizzle_orm_1.sql) `count(*)`,
        totalCollected: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'INBOUND_AR' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        totalDisbursed: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'OUTBOUND_AP' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
    })
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.and)(...baseConditions))
        .groupBy(schema_1.payments.paymentMethod)
        .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `sum(${schema_1.payments.amount})`));
    // 4. Cash Flow Velocity Timeline (Inflow vs. Outflow)
    const timeBucketSql = query.interval === 'HOUR'
        ? (0, drizzle_orm_1.sql) `to_char(${schema_1.payments.createdAt}, 'YYYY-MM-DD HH24:00')`
        : (0, drizzle_orm_1.sql) `to_char(${schema_1.payments.createdAt}, 'YYYY-MM-DD')`;
    const timeline = await db_1.db
        .select({
        timeBucket: timeBucketSql,
        inflow: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'INBOUND_AR' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        outflow: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentFlow} = 'OUTBOUND_AP' and ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        netCash: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.status} in ('POSTED', 'RECONCILED') then (case when ${schema_1.payments.paymentFlow} = 'INBOUND_AR' then ${schema_1.payments.amount} else -${schema_1.payments.amount} end) else 0 end), 0)::numeric`,
        transactionCount: (0, drizzle_orm_1.sql) `count(*)`,
    })
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.and)(...baseConditions))
        .groupBy(timeBucketSql)
        .orderBy((0, drizzle_orm_1.asc)(timeBucketSql));
    // 5. Paginated Detailed Transaction Ledger
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const [countResult, ledgerTransactions] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)(...baseConditions)),
        db_1.db
            .select({
            id: schema_1.payments.id,
            paymentNumber: schema_1.payments.paymentNumber,
            paymentFlow: schema_1.payments.paymentFlow,
            status: schema_1.payments.status,
            paymentMethod: schema_1.payments.paymentMethod,
            clearingAccount: schema_1.payments.clearingAccount,
            transactionReference: schema_1.payments.transactionReference,
            amount: schema_1.payments.amount,
            currency: schema_1.payments.currency,
            orderId: schema_1.payments.orderId,
            orderNumber: schema_1.orders.orderNumber,
            supplierId: schema_1.payments.supplierId,
            supplierName: schema_1.suppliers.name,
            branchId: schema_1.payments.branchId,
            branchName: schema_1.branches.name,
            processedByName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            isReversed: schema_1.payments.isReversed,
            reconciledAt: schema_1.payments.reconciledAt,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments)
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.payments.orderId, schema_1.orders.id))
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.payments.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.payments.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.payments.processedById, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...baseConditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))
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
exports.getPaymentReportMetrics = getPaymentReportMetrics;
const getExportablePaymentReport = async (tenantId, query) => {
    return await (0, exports.getPaymentReportMetrics)(tenantId, { ...query, limit: 2000, page: 1 });
};
exports.getExportablePaymentReport = getExportablePaymentReport;
