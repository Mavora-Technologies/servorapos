"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSupervisorAuditResolution = exports.listReconciliationAuditRecords = exports.getReconciliationDailyTelemetry = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getReconciliationDailyTelemetry = async (tenantId, branchId, dateStr) => {
    const targetDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.cashierShifts.openedAt}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.cashierShifts.openedAt}) = current_date`;
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, branchId) : undefined;
    const paymentBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.payments.branchId, branchId) : undefined;
    const mpesaBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.branchId, branchId) : undefined;
    // 1. Aggregate Closed Shift Fiduciary Data
    const [shiftSummary] = await db_1.db
        .select({
        totalClosedShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'CLOSED' then 1 end)::int`,
        pendingOpenShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'OPEN' then 1 end)::int`,
        totalExpectedCash: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.cashierShifts.status} = 'CLOSED' then coalesce(${schema_1.cashierShifts.expectedCash}, 0) else 0 end), 0)::numeric`,
        totalCountedCash: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.cashierShifts.status} = 'CLOSED' then coalesce(${schema_1.cashierShifts.countedCash}, 0) else 0 end), 0)::numeric`,
        netCashVariance: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.cashierShifts.status} = 'CLOSED' then coalesce(${schema_1.cashierShifts.variance}, 0) else 0 end), 0)::numeric`,
    })
        .from(schema_1.cashierShifts)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), branchCondition, targetDateSql));
    // 2. Aggregate Multi-Tender Reconciliation (M-Pesa, Card, Cash)
    const paymentDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.payments.createdAt}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.payments.createdAt}) = current_date`;
    const [paymentTenders] = await db_1.db
        .select({
        cardTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentMethod} = 'CREDIT_CARD' and ${schema_1.payments.status} = 'POSTED' then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        bankTransferTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentMethod} = 'BANK_TRANSFER' and ${schema_1.payments.status} = 'POSTED' then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
    })
        .from(schema_1.payments)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), paymentBranchCondition, paymentDateSql));
    // 3. Aggregate Cleared M-Pesa IPN Webhook Volume
    const mpesaDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.mpesaTransactions.transactionDate}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.mpesaTransactions.transactionDate}) = current_date`;
    const [mpesaStats] = await db_1.db
        .select({
        totalMpesaCleared: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.mpesaTransactions.status} = 'COMPLETED' then ${schema_1.mpesaTransactions.amount} else 0 end), 0)::numeric`,
        mpesaTransactionCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.mpesaTransactions.status} = 'COMPLETED' then 1 end)::int`,
    })
        .from(schema_1.mpesaTransactions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.tenantId, tenantId), mpesaBranchCondition, mpesaDateSql));
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
exports.getReconciliationDailyTelemetry = getReconciliationDailyTelemetry;
const listReconciliationAuditRecords = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const dateCondition = query.date
        ? (0, drizzle_orm_1.sql) `date(${schema_1.cashierShifts.openedAt}) = ${query.date}::date`
        : undefined;
    const branchCondition = query.branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, query.branchId) : undefined;
    const statusCondition = query.status === 'BALANCED'
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'CLOSED'), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.variance, '0.00'))
        : query.status === 'DISCREPANCY'
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'CLOSED'), (0, drizzle_orm_1.sql) `coalesce(${schema_1.cashierShifts.variance}, 0) != 0`)
            : query.status === 'PENDING_AUDIT'
                ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN')
                : undefined;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId),
        branchCondition,
        dateCondition,
        statusCondition,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            shiftId: schema_1.cashierShifts.id,
            branchId: schema_1.cashierShifts.branchId,
            branchName: schema_1.branches.name,
            cashierId: schema_1.cashierShifts.cashierId,
            cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            openingFloat: schema_1.cashierShifts.openingFloat,
            expectedCash: schema_1.cashierShifts.expectedCash,
            countedCash: schema_1.cashierShifts.countedCash,
            variance: schema_1.cashierShifts.variance,
            status: schema_1.cashierShifts.status,
            varianceNotes: schema_1.cashierShifts.varianceNotes,
            openedAt: schema_1.cashierShifts.openedAt,
            closedAt: schema_1.cashierShifts.closedAt,
            supervisorName: (0, drizzle_orm_1.sql) `(SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) FROM users u WHERE u.id = ${schema_1.cashierShifts.closedByUserId})`,
        })
            .from(schema_1.cashierShifts)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.cashierShifts.openedAt))
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
exports.listReconciliationAuditRecords = listReconciliationAuditRecords;
const submitSupervisorAuditResolution = async (tenantId, supervisorId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [shift] = await tx
            .select()
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, input.shiftId), (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId)))
            .limit(1);
        if (!shift)
            throw new Error('Shift record not found');
        const updatedNote = [
            shift.varianceNotes,
            `[Audit Resolution - ${input.auditResolution}] Deposited: KES ${input.actualDepositAmount.toLocaleString()} to ${input.clearingAccountId}. Notes: ${input.auditorNotes || 'No additional commentary'}`,
        ]
            .filter(Boolean)
            .join(' | ');
        const [updated] = await tx
            .update(schema_1.cashierShifts)
            .set({
            varianceNotes: updatedNote,
            closedByUserId: supervisorId,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, shift.id))
            .returning();
        // If escalated or severe variance, notify executive controllers
        if (input.auditResolution === 'DISPUTED_ESCALATED') {
            await tx.insert(schema_1.notifications).values({
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
exports.submitSupervisorAuditResolution = submitSupervisorAuditResolution;
