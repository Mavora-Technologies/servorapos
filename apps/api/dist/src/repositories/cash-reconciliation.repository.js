"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitSupervisorAuditResolution = exports.listReconciliationAuditRecords = exports.getReconciliationDailyTelemetry = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
// Helper to compute live POS sales & drawer session details for any shift
async function enrichShiftForReconciliation(tenantId, shift) {
    const openingFloat = Number(shift.openingFloat) || 0;
    const [linkedSession] = await db_1.db
        .select({
        id: schema_1.drawerSessions.id,
        drawerId: schema_1.drawerSessions.drawerId,
        drawerName: schema_1.cashDrawers.name,
        drawerCode: schema_1.cashDrawers.drawerCode,
        cashSalesTotal: schema_1.drawerSessions.cashSalesTotal,
        cashDropsTotal: schema_1.drawerSessions.cashDropsTotal,
        payoutsTotal: schema_1.drawerSessions.payoutsTotal,
        denominations: schema_1.drawerSessions.denominations,
    })
        .from(schema_1.drawerSessions)
        .innerJoin(schema_1.cashDrawers, (0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, schema_1.cashDrawers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.drawerSessions.cashierId, shift.cashierId), (0, drizzle_orm_1.gte)(schema_1.drawerSessions.openedAt, new Date(shift.openedAt.getTime() - 60_000))))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt))
        .limit(1);
    let posSalesDoneSoFar = 0;
    let liveExpectedCash = Number(shift.expectedCash) || 0;
    const safeDropsTotal = Number(linkedSession?.cashDropsTotal || 0);
    const payoutsTotal = Number(linkedSession?.payoutsTotal || 0);
    if (shift.status === 'OPEN') {
        const scopeFilter = (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.orders.cashierId, shift.cashierId), (0, drizzle_orm_1.eq)(schema_1.orders.waiterId, shift.cashierId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(schema_1.orders.cashierId), shift.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, shift.branchId) : (0, drizzle_orm_1.sql) `true`));
        const [orderSalesAgg] = await db_1.db
            .select({
            totalFromOrders: (0, drizzle_orm_1.sql) `coalesce(sum(
          case 
            when coalesce(${schema_1.orders.amountPaid}, 0) > 0 then ${schema_1.orders.amountPaid}
            else coalesce(${schema_1.orders.total}, 0)
          end
        ), 0)::numeric`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.status}) != 'CANCELLED'`, (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) != 'REFUNDED'`, (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, shift.openedAt), scopeFilter));
        posSalesDoneSoFar = Math.max(Number(linkedSession?.cashSalesTotal || 0), Number(orderSalesAgg?.totalFromOrders || 0));
        liveExpectedCash = Math.max(0, openingFloat + posSalesDoneSoFar - safeDropsTotal - payoutsTotal);
    }
    else {
        posSalesDoneSoFar = Math.max(Number(linkedSession?.cashSalesTotal || 0), Math.max(0, liveExpectedCash + safeDropsTotal + payoutsTotal - openingFloat));
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
        isAuditSignedOff: Boolean(shift.varianceNotes && shift.varianceNotes.includes('[Audit Resolution -')),
    };
}
const getReconciliationDailyTelemetry = async (tenantId, branchId, dateStr) => {
    const targetDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.cashierShifts.openedAt}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.cashierShifts.openedAt}) = current_date`;
    const branchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, branchId) : undefined;
    const orderBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined;
    const paymentBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.payments.branchId, branchId) : undefined;
    const mpesaBranchCondition = branchId ? (0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.branchId, branchId) : undefined;
    // 1. Fetch all shifts for target date to compute live expected & closed totals accurately
    const dayShifts = await db_1.db
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
        supervisorName: (0, drizzle_orm_1.sql) `null`,
    })
        .from(schema_1.cashierShifts)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.branchId, schema_1.branches.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), branchCondition, targetDateSql));
    const enrichedDayShifts = await Promise.all(dayShifts.map((s) => enrichShiftForReconciliation(tenantId, s)));
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
        }
        else {
            pendingActive += 1;
        }
    }
    // 2. Aggregate Multi-Tender Reconciliation across Payments, M-Pesa & POS Orders
    const paymentDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.payments.createdAt}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.payments.createdAt}) = current_date`;
    const mpesaDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.mpesaTransactions.transactionDate}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.mpesaTransactions.transactionDate}) = current_date`;
    const orderDateSql = dateStr
        ? (0, drizzle_orm_1.sql) `date(${schema_1.orders.createdAt}) = ${dateStr}::date`
        : (0, drizzle_orm_1.sql) `date(${schema_1.orders.createdAt}) = current_date`;
    const [[paymentTenders], [mpesaStats], [orderStats]] = await Promise.all([
        db_1.db
            .select({
            cardTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentMethod} = 'CREDIT_CARD' and ${schema_1.payments.isReversed} = false then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
            bankTransferTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentMethod} = 'BANK_TRANSFER' and ${schema_1.payments.isReversed} = false then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
            mpesaInboundTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.payments.paymentMethod} = 'MPESA_B2B' and ${schema_1.payments.paymentFlow} = 'INBOUND_AR' and ${schema_1.payments.isReversed} = false then ${schema_1.payments.amount} else 0 end), 0)::numeric`,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.tenantId, tenantId), paymentBranchCondition, paymentDateSql)),
        db_1.db
            .select({
            totalMpesaCleared: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.mpesaTransactions.status} = 'COMPLETED' then ${schema_1.mpesaTransactions.amount} else 0 end), 0)::numeric`,
            mpesaTransactionCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.mpesaTransactions.status} = 'COMPLETED' then 1 end)::int`,
        })
            .from(schema_1.mpesaTransactions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.mpesaTransactions.tenantId, tenantId), mpesaBranchCondition, mpesaDateSql)),
        db_1.db
            .select({
            grossOrdersTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when UPPER(${schema_1.orders.status}) != 'CANCELLED' then ${schema_1.orders.total} else 0 end), 0)::numeric`,
            ordersCount: (0, drizzle_orm_1.sql) `count(case when UPPER(${schema_1.orders.status}) != 'CANCELLED' then 1 end)::int`,
            taxCollected: (0, drizzle_orm_1.sql) `coalesce(sum(case when UPPER(${schema_1.orders.status}) != 'CANCELLED' then ${schema_1.orders.tax} else 0 end), 0)::numeric`,
            levyCollected: (0, drizzle_orm_1.sql) `coalesce(sum(case when UPPER(${schema_1.orders.status}) != 'CANCELLED' then ${schema_1.orders.cateringLevy} else 0 end), 0)::numeric`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), orderBranchCondition, orderDateSql)),
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
            mpesaClearedKes: Math.max(Number(mpesaStats?.totalMpesaCleared || 0), Number(paymentTenders?.mpesaInboundTotal || 0)),
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
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'CLOSED'), (0, drizzle_orm_1.sql) `coalesce(${schema_1.cashierShifts.variance}, 0) = 0`)
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
    const enrichedRecords = await Promise.all(rows.map((r) => enrichShiftForReconciliation(tenantId, r)));
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
            `[Audit Resolution - ${input.auditResolution}] Deposited: KES ${input.actualDepositAmount.toLocaleString()} to ${input.clearingAccountId}. Notes: ${input.auditorNotes || 'Verified'}`,
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
        // 1. Write Immutable Audit Log
        await tx.insert(schema_1.auditLogs).values({
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
            await tx.insert(schema_1.financialAdjustments).values({
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
            await tx.insert(schema_1.notifications).values({
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
exports.submitSupervisorAuditResolution = submitSupervisorAuditResolution;
