"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPayoutRuns = exports.settlePayoutRunTransaction = exports.approvePayoutRunTransaction = exports.generatePayoutRunTransaction = exports.computeLiveCommissions = exports.updateCommissionPlanTransaction = exports.createCommissionPlanTransaction = exports.listCommissionPlans = void 0;
// apps/api/src/repositories/commission.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function calculateTieredAmount(amount, tiers) {
    const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
    let remaining = amount;
    let total = 0;
    let highestRate = 0;
    for (const tier of sorted) {
        if (remaining <= 0 || amount <= tier.minAmount)
            continue;
        const upper = tier.maxAmount ?? Number.POSITIVE_INFINITY;
        const slice = Math.max(0, Math.min(amount, upper) - tier.minAmount);
        if (slice > 0) {
            total += (slice * tier.ratePercent) / 100;
            highestRate = tier.ratePercent;
        }
    }
    return {
        commission: Number(total.toFixed(2)),
        label: `Tiered (up to ${highestRate}%)`,
    };
}
const listCommissionPlans = async (tenantId, effectiveBranchIds) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.commissionPlans.tenantId, tenantId)];
    if (effectiveBranchIds !== null) {
        if (effectiveBranchIds.length === 0) {
            conditions.push((0, drizzle_orm_1.isNull)(schema_1.commissionPlans.branchId));
        }
        else {
            const scope = (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.commissionPlans.branchId), (0, drizzle_orm_1.inArray)(schema_1.commissionPlans.branchId, effectiveBranchIds));
            if (scope)
                conditions.push(scope);
        }
    }
    return await db_1.db
        .select({
        id: schema_1.commissionPlans.id,
        name: schema_1.commissionPlans.name,
        description: schema_1.commissionPlans.description,
        branchId: schema_1.commissionPlans.branchId,
        branchName: schema_1.branches.name,
        targetRole: schema_1.commissionPlans.targetRole,
        targetUserId: schema_1.commissionPlans.targetUserId,
        attributionMode: schema_1.commissionPlans.attributionMode,
        productScope: schema_1.commissionPlans.productScope,
        menuCategoryId: schema_1.commissionPlans.menuCategoryId,
        menuItemId: schema_1.commissionPlans.menuItemId,
        basisType: schema_1.commissionPlans.basisType,
        rateType: schema_1.commissionPlans.rateType,
        flatRate: schema_1.commissionPlans.flatRate,
        tiers: schema_1.commissionPlans.tiers,
        minQualifyingSales: schema_1.commissionPlans.minQualifyingSales,
        maxPayoutCap: schema_1.commissionPlans.maxPayoutCap,
        clawbackOnRefund: schema_1.commissionPlans.clawbackOnRefund,
        effectiveFrom: schema_1.commissionPlans.effectiveFrom,
        effectiveTo: schema_1.commissionPlans.effectiveTo,
        isActive: schema_1.commissionPlans.isActive,
        createdAt: schema_1.commissionPlans.createdAt,
    })
        .from(schema_1.commissionPlans)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.commissionPlans.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.commissionPlans.isActive), (0, drizzle_orm_1.asc)(schema_1.commissionPlans.name));
};
exports.listCommissionPlans = listCommissionPlans;
const createCommissionPlanTransaction = async (tenantId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [created] = await tx
            .insert(schema_1.commissionPlans)
            .values({
            tenantId,
            branchId: input.branchId ?? null,
            name: input.name,
            description: input.description ?? null,
            targetRole: input.targetRole ?? null,
            targetUserId: input.targetUserId ?? null,
            attributionMode: input.attributionMode,
            productScope: input.productScope,
            menuCategoryId: input.menuCategoryId ?? null,
            menuItemId: input.menuItemId ?? null,
            basisType: input.basisType,
            rateType: input.rateType,
            flatRate: input.flatRate.toFixed(4),
            tiers: input.tiers,
            minQualifyingSales: input.minQualifyingSales.toFixed(2),
            maxPayoutCap: input.maxPayoutCap !== null ? input.maxPayoutCap.toFixed(2) : null,
            clawbackOnRefund: input.clawbackOnRefund,
            effectiveFrom: input.effectiveFrom,
            effectiveTo: input.effectiveTo ?? null,
            isActive: input.isActive,
            createdById: actor.userId,
        })
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: created.branchId,
            userId: actor.userId,
            action: 'COMMISSION_PLAN_CREATED',
            module: 'WORKFORCE_HCM',
            entityType: 'commission_plans',
            entityId: String(created.id),
            newValues: { name: created.name, basisType: created.basisType, rateType: created.rateType },
            ipAddress: actor.ipAddress ?? null,
        });
        return created;
    });
};
exports.createCommissionPlanTransaction = createCommissionPlanTransaction;
const updateCommissionPlanTransaction = async (tenantId, planId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.commissionPlans)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.commissionPlans.id, planId), (0, drizzle_orm_1.eq)(schema_1.commissionPlans.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        const [updated] = await tx
            .update(schema_1.commissionPlans)
            .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.flatRate !== undefined ? { flatRate: input.flatRate.toFixed(4) } : {}),
            ...(input.tiers !== undefined ? { tiers: input.tiers } : {}),
            ...(input.minQualifyingSales !== undefined
                ? { minQualifyingSales: input.minQualifyingSales.toFixed(2) }
                : {}),
            ...(input.maxPayoutCap !== undefined
                ? { maxPayoutCap: input.maxPayoutCap !== null ? input.maxPayoutCap.toFixed(2) : null }
                : {}),
            ...(input.clawbackOnRefund !== undefined
                ? { clawbackOnRefund: input.clawbackOnRefund }
                : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.commissionPlans.id, planId), (0, drizzle_orm_1.eq)(schema_1.commissionPlans.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updated.branchId,
            userId: actor.userId,
            action: 'COMMISSION_PLAN_UPDATED',
            module: 'WORKFORCE_HCM',
            entityType: 'commission_plans',
            entityId: String(updated.id),
            previousValues: { flatRate: existing.flatRate, isActive: existing.isActive },
            newValues: { flatRate: updated.flatRate, isActive: updated.isActive },
            ipAddress: actor.ipAddress ?? null,
        });
        return updated;
    });
};
exports.updateCommissionPlanTransaction = updateCommissionPlanTransaction;
/**
 * Live Commission Computation Engine:
 * Evaluates all active commission_plans against real settled orders, order_items, and refunds.
 */
const computeLiveCommissions = async (tenantId, periodStart, periodEnd, effectiveBranchIds) => {
    const startTs = new Date(`${periodStart}T00:00:00.000Z`);
    const endTs = new Date(`${periodEnd}T23:59:59.999Z`);
    const planConditions = [
        (0, drizzle_orm_1.eq)(schema_1.commissionPlans.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.commissionPlans.isActive, true),
        (0, drizzle_orm_1.lte)(schema_1.commissionPlans.effectiveFrom, periodEnd),
    ];
    const orderConditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, startTs),
        (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, endTs),
        (0, drizzle_orm_1.notInArray)(schema_1.orders.status, ['Cancelled', 'Draft']),
    ];
    const refundConditions = [
        (0, drizzle_orm_1.eq)(schema_1.refunds.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.refunds.refundFlow, 'AR_CUSTOMER_REFUND'),
        (0, drizzle_orm_1.notInArray)(schema_1.refunds.status, ['CANCELLED']),
        (0, drizzle_orm_1.gte)(schema_1.refunds.createdAt, startTs),
        (0, drizzle_orm_1.lte)(schema_1.refunds.createdAt, endTs),
    ];
    if (effectiveBranchIds !== null) {
        if (effectiveBranchIds.length === 0) {
            return { currency: 'KES', lines: [] };
        }
        orderConditions.push((0, drizzle_orm_1.inArray)(schema_1.orders.branchId, effectiveBranchIds));
        refundConditions.push((0, drizzle_orm_1.inArray)(schema_1.refunds.branchId, effectiveBranchIds));
    }
    const [plans, rawOrderLines, refundRows, staffRows, [finSettings]] = await Promise.all([
        db_1.db.select().from(schema_1.commissionPlans).where((0, drizzle_orm_1.and)(...planConditions)),
        db_1.db
            .select({
            orderId: schema_1.orders.id,
            branchId: schema_1.orders.branchId,
            waiterId: schema_1.orders.waiterId,
            cashierId: schema_1.orders.cashierId,
            orderSubtotal: schema_1.orders.subtotal,
            orderDiscount: schema_1.orders.discountTotal,
            orderTotal: schema_1.orders.total,
            menuItemId: schema_1.orderItems.menuItemId,
            categoryId: schema_1.menuItems.categoryId,
            quantity: schema_1.orderItems.quantity,
            totalPrice: schema_1.orderItems.totalPrice,
            unitCostSnapshot: schema_1.orderItems.unitCostSnapshot,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .innerJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), ...orderConditions)),
        db_1.db
            .select({
            orderId: schema_1.refunds.orderId,
            amount: schema_1.refunds.amount,
            waiterId: schema_1.orders.waiterId,
            cashierId: schema_1.orders.cashierId,
        })
            .from(schema_1.refunds)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.refunds.orderId, schema_1.orders.id))
            .where((0, drizzle_orm_1.and)(...refundConditions)),
        db_1.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            role: schema_1.users.role,
            defaultBranchId: schema_1.users.defaultBranchId,
            branchName: schema_1.branches.name,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true))),
        db_1.db
            .select({ baseCurrency: schema_1.tenantFinancialSettings.baseCurrency })
            .from(schema_1.tenantFinancialSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
            .limit(1),
    ]);
    const staffMap = new Map(staffRows.map((s) => [s.id, s]));
    const lines = [];
    for (const plan of plans) {
        if (plan.effectiveTo && plan.effectiveTo < periodStart)
            continue;
        // Accumulate qualifying metrics per staff member for this plan
        const bucket = new Map();
        for (const row of rawOrderLines) {
            if (plan.branchId && row.branchId !== plan.branchId)
                continue;
            if (plan.productScope === 'CATEGORY' && row.categoryId !== plan.menuCategoryId)
                continue;
            if (plan.productScope === 'MENU_ITEM' && row.menuItemId !== plan.menuItemId)
                continue;
            const attributedUserId = plan.attributionMode === 'WAITER_ONLY'
                ? row.waiterId
                : plan.attributionMode === 'CASHIER_ONLY'
                    ? row.cashierId
                    : row.waiterId ?? row.cashierId;
            if (!attributedUserId)
                continue;
            const staff = staffMap.get(attributedUserId);
            if (!staff)
                continue;
            if (plan.targetUserId && staff.id !== plan.targetUserId)
                continue;
            if (plan.targetRole && staff.role !== plan.targetRole)
                continue;
            const qty = parseFloat(row.quantity) || 0;
            const lineTotal = parseFloat(row.totalPrice) || 0;
            const lineCost = qty * (parseFloat(row.unitCostSnapshot) || 0);
            let basisValue = lineTotal;
            if (plan.basisType === 'GROSS_MARGIN') {
                basisValue = Math.max(0, lineTotal - lineCost);
            }
            else if (plan.basisType === 'NET_SALES') {
                // Pro-rate net pre-tax ratio from parent order
                const orderTotal = parseFloat(row.orderTotal) || 0;
                const orderNet = Math.max(0, (parseFloat(row.orderSubtotal) || 0) - (parseFloat(row.orderDiscount) || 0));
                const netRatio = orderTotal > 0 ? orderNet / orderTotal : 1;
                basisValue = lineTotal * netRatio;
            }
            const acc = bucket.get(staff.id) ?? {
                orderIds: new Set(),
                sales: 0,
                units: 0,
                refundSales: 0,
            };
            acc.orderIds.add(row.orderId);
            acc.sales += basisValue;
            acc.units += qty;
            bucket.set(staff.id, acc);
        }
        // Apply refund clawbacks if enabled on this plan
        if (plan.clawbackOnRefund) {
            for (const ref of refundRows) {
                const attributedUserId = plan.attributionMode === 'WAITER_ONLY'
                    ? ref.waiterId
                    : plan.attributionMode === 'CASHIER_ONLY'
                        ? ref.cashierId
                        : ref.waiterId ?? ref.cashierId;
                if (!attributedUserId)
                    continue;
                const acc = bucket.get(attributedUserId);
                if (acc) {
                    acc.refundSales += parseFloat(ref.amount) || 0;
                }
            }
        }
        const minHurdle = parseFloat(plan.minQualifyingSales) || 0;
        const flatRate = parseFloat(plan.flatRate) || 0;
        const maxCap = plan.maxPayoutCap ? parseFloat(plan.maxPayoutCap) : null;
        for (const [userId, acc] of bucket.entries()) {
            const staff = staffMap.get(userId);
            if (!staff)
                continue;
            if (acc.sales < minHurdle)
                continue;
            let grossComm = 0;
            let rateLabel = '';
            if (plan.rateType === 'FLAT_PER_UNIT') {
                grossComm = acc.units * flatRate;
                rateLabel = `${finSettings?.baseCurrency ?? 'KES'} ${flatRate}/unit`;
            }
            else if (plan.rateType === 'TIERED_ACCELERATOR') {
                const tiered = calculateTieredAmount(acc.sales, plan.tiers ?? []);
                grossComm = tiered.commission;
                rateLabel = tiered.label;
            }
            else {
                grossComm = (acc.sales * flatRate) / 100;
                rateLabel = `${flatRate}%`;
            }
            const clawbackAmt = plan.clawbackOnRefund && acc.refundSales > 0 && plan.rateType !== 'FLAT_PER_UNIT'
                ? Number(((acc.refundSales * flatRate) / 100).toFixed(2))
                : 0;
            let netComm = Math.max(0, grossComm - clawbackAmt);
            if (maxCap !== null && netComm > maxCap) {
                netComm = maxCap;
            }
            lines.push({
                userId: staff.id,
                employeeName: `${staff.firstName} ${staff.lastName}`.trim(),
                employeeRole: staff.role,
                branchId: plan.branchId ?? staff.defaultBranchId,
                branchName: staff.branchName || 'Unassigned',
                planId: plan.id,
                planName: plan.name,
                ordersCount: acc.orderIds.size,
                qualifyingUnits: Number(acc.units.toFixed(2)),
                qualifyingSales: Number(acc.sales.toFixed(2)),
                effectiveRateLabel: rateLabel,
                grossCommission: Number(grossComm.toFixed(2)),
                clawbackAmount: Number(clawbackAmt.toFixed(2)),
                netCommission: Number(netComm.toFixed(2)),
            });
        }
    }
    return {
        currency: finSettings?.baseCurrency ?? 'KES',
        lines: lines.sort((a, b) => b.netCommission - a.netCommission),
    };
};
exports.computeLiveCommissions = computeLiveCommissions;
const generatePayoutRunTransaction = async (tenantId, periodStart, periodEnd, branchId, effectiveBranchIds, notes, actor) => {
    const { currency, lines } = await (0, exports.computeLiveCommissions)(tenantId, periodStart, periodEnd, effectiveBranchIds);
    if (lines.length === 0) {
        throw new Error('No qualifying commission earnings found for the selected period and scope.');
    }
    return await db_1.db.transaction(async (tx) => {
        const runNumber = `COM-${periodEnd.replace(/-/g, '').slice(0, 6)}-${Date.now().toString().slice(-4)}`;
        const uniqueUsers = new Set(lines.map((l) => l.userId)).size;
        const totalSales = lines.reduce((s, l) => s + l.qualifyingSales, 0);
        const totalGross = lines.reduce((s, l) => s + l.grossCommission, 0);
        const totalClawbacks = lines.reduce((s, l) => s + l.clawbackAmount, 0);
        const netPayable = lines.reduce((s, l) => s + l.netCommission, 0);
        const [run] = await tx
            .insert(schema_1.commissionPayoutRuns)
            .values({
            tenantId,
            branchId,
            runNumber,
            periodStart,
            periodEnd,
            currency,
            employeeCount: uniqueUsers,
            totalQualifyingSales: totalSales.toFixed(2),
            totalGrossCommission: totalGross.toFixed(2),
            totalClawbacks: totalClawbacks.toFixed(2),
            netPayableAmount: netPayable.toFixed(2),
            status: 'DRAFT',
            createdById: actor.userId,
            notes,
        })
            .returning();
        await tx.insert(schema_1.commissionLedgerEntries).values(lines.map((l) => ({
            tenantId,
            payoutRunId: run.id,
            branchId: l.branchId,
            userId: l.userId,
            planId: l.planId,
            planNameSnapshot: l.planName,
            ordersCount: l.ordersCount,
            qualifyingUnits: l.qualifyingUnits.toFixed(2),
            qualifyingSales: l.qualifyingSales.toFixed(2),
            effectiveRateLabel: l.effectiveRateLabel,
            grossCommission: l.grossCommission.toFixed(2),
            clawbackAmount: l.clawbackAmount.toFixed(2),
            netCommission: l.netCommission.toFixed(2),
            status: 'ACCRUED',
        })));
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId,
            userId: actor.userId,
            action: 'COMMISSION_RUN_GENERATED',
            module: 'FINANCE',
            entityType: 'commission_payout_runs',
            entityId: String(run.id),
            newValues: { runNumber: run.runNumber, netPayableAmount: run.netPayableAmount, employeeCount: uniqueUsers },
            ipAddress: actor.ipAddress ?? null,
        });
        return run;
    });
};
exports.generatePayoutRunTransaction = generatePayoutRunTransaction;
const approvePayoutRunTransaction = async (tenantId, runId, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.commissionPayoutRuns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.id, runId), (0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status !== 'DRAFT') {
            throw new Error('Only DRAFT commission runs can be approved.');
        }
        if (existing.createdById === actor.userId &&
            actor.role !== 'ADMIN' &&
            actor.role !== 'SUPER_ADMIN') {
            throw new Error('Maker-checker governance: Another supervisor must approve this payout run.');
        }
        const [approved] = await tx
            .update(schema_1.commissionPayoutRuns)
            .set({
            status: 'APPROVED',
            approvedByUserId: actor.userId,
            approvedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.id, runId))
            .returning();
        await tx
            .update(schema_1.commissionLedgerEntries)
            .set({ status: 'APPROVED' })
            .where((0, drizzle_orm_1.eq)(schema_1.commissionLedgerEntries.payoutRunId, runId));
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: approved.branchId,
            userId: actor.userId,
            action: 'COMMISSION_RUN_APPROVED',
            module: 'FINANCE',
            entityType: 'commission_payout_runs',
            entityId: String(approved.id),
            newValues: { runNumber: approved.runNumber, netPayableAmount: approved.netPayableAmount },
            ipAddress: actor.ipAddress ?? null,
        });
        return approved;
    });
};
exports.approvePayoutRunTransaction = approvePayoutRunTransaction;
const settlePayoutRunTransaction = async (tenantId, runId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.commissionPayoutRuns)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.id, runId), (0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status !== 'APPROVED') {
            throw new Error('Commission run must be APPROVED before disbursement.');
        }
        const [paid] = await tx
            .update(schema_1.commissionPayoutRuns)
            .set({
            status: 'PAID',
            paymentMethod: input.paymentMethod,
            paymentReference: input.paymentReference,
            paidAt: new Date(),
            notes: input.notes ?? existing.notes,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.id, runId))
            .returning();
        const entries = await tx
            .update(schema_1.commissionLedgerEntries)
            .set({ status: 'PAID' })
            .where((0, drizzle_orm_1.eq)(schema_1.commissionLedgerEntries.payoutRunId, runId))
            .returning({ userId: schema_1.commissionLedgerEntries.userId, netCommission: schema_1.commissionLedgerEntries.netCommission });
        // Notify each associate of their disbursed commission
        const byUser = new Map();
        for (const e of entries) {
            byUser.set(e.userId, (byUser.get(e.userId) ?? 0) + (parseFloat(e.netCommission) || 0));
        }
        const notifRows = Array.from(byUser.entries()).map(([userId, amount]) => ({
            tenantId,
            branchId: paid.branchId,
            userId,
            title: `Commission Disbursed (${paid.runNumber})`,
            detail: `Your sales commission of ${paid.currency} ${amount.toLocaleString()} for ${paid.periodStart} – ${paid.periodEnd} has been settled via ${input.paymentMethod} (Ref: ${input.paymentReference}).`,
            severity: 'SUCCESS',
            module: 'WORKFORCE_HCM',
            category: 'FYI_STREAM',
            entityType: 'commission_payout_runs',
            entityId: String(paid.id),
            actionUrl: '/staff/performance',
            isRead: false,
            isResolved: true,
        }));
        if (notifRows.length > 0) {
            await tx.insert(schema_1.notifications).values(notifRows);
        }
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: paid.branchId,
            userId: actor.userId,
            action: 'COMMISSION_RUN_PAID',
            module: 'FINANCE',
            entityType: 'commission_payout_runs',
            entityId: String(paid.id),
            newValues: {
                paymentMethod: input.paymentMethod,
                paymentReference: input.paymentReference,
                netPayableAmount: paid.netPayableAmount,
            },
            ipAddress: actor.ipAddress ?? null,
        });
        return paid;
    });
};
exports.settlePayoutRunTransaction = settlePayoutRunTransaction;
const listPayoutRuns = async (tenantId, effectiveBranchIds) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.commissionPayoutRuns.tenantId, tenantId)];
    if (effectiveBranchIds !== null) {
        if (effectiveBranchIds.length === 0)
            return [];
        const scope = (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.commissionPayoutRuns.branchId), (0, drizzle_orm_1.inArray)(schema_1.commissionPayoutRuns.branchId, effectiveBranchIds));
        if (scope)
            conditions.push(scope);
    }
    return await db_1.db
        .select()
        .from(schema_1.commissionPayoutRuns)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.commissionPayoutRuns.createdAt))
        .limit(100);
};
exports.listPayoutRuns = listPayoutRuns;
