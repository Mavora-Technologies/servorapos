// apps/api/src/repositories/commission.repository.ts
import {
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  inArray,
  notInArray,
  or,
  isNull,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../config/db';
import {
  commissionPlans,
  commissionPayoutRuns,
  commissionLedgerEntries,
  orders,
  orderItems,
  menuItems,
  refunds,
  users,
  branches,
  tenantFinancialSettings,
  auditLogs,
  notifications,
  type CommissionTierRule,
} from '../config/schema';
import type {
  CreateCommissionPlanInput,
  UpdateCommissionPlanInput,
  SettlePayoutRunInput,
} from '../validators/commission.validator';

export interface CommissionAuditActor {
  userId: number;
  role: string;
  ipAddress?: string | null;
}

export interface ComputedCommissionLine {
  userId: number;
  employeeName: string;
  employeeRole: string;
  branchId: number | null;
  branchName: string;
  planId: number;
  planName: string;
  ordersCount: number;
  qualifyingUnits: number;
  qualifyingSales: number;
  effectiveRateLabel: string;
  grossCommission: number;
  clawbackAmount: number;
  netCommission: number;
}

function calculateTieredAmount(
  amount: number,
  tiers: CommissionTierRule[]
): { commission: number; label: string } {
  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  let remaining = amount;
  let total = 0;
  let highestRate = 0;

  for (const tier of sorted) {
    if (remaining <= 0 || amount <= tier.minAmount) continue;
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

export const listCommissionPlans = async (
  tenantId: number,
  effectiveBranchIds: number[] | null
) => {
  const conditions: SQL[] = [eq(commissionPlans.tenantId, tenantId)];
  if (effectiveBranchIds !== null) {
    if (effectiveBranchIds.length === 0) {
      conditions.push(isNull(commissionPlans.branchId));
    } else {
      const scope = or(
        isNull(commissionPlans.branchId),
        inArray(commissionPlans.branchId, effectiveBranchIds)
      );
      if (scope) conditions.push(scope);
    }
  }

  return await db
    .select({
      id: commissionPlans.id,
      name: commissionPlans.name,
      description: commissionPlans.description,
      branchId: commissionPlans.branchId,
      branchName: branches.name,
      targetRole: commissionPlans.targetRole,
      targetUserId: commissionPlans.targetUserId,
      attributionMode: commissionPlans.attributionMode,
      productScope: commissionPlans.productScope,
      menuCategoryId: commissionPlans.menuCategoryId,
      menuItemId: commissionPlans.menuItemId,
      basisType: commissionPlans.basisType,
      rateType: commissionPlans.rateType,
      flatRate: commissionPlans.flatRate,
      tiers: commissionPlans.tiers,
      minQualifyingSales: commissionPlans.minQualifyingSales,
      maxPayoutCap: commissionPlans.maxPayoutCap,
      clawbackOnRefund: commissionPlans.clawbackOnRefund,
      effectiveFrom: commissionPlans.effectiveFrom,
      effectiveTo: commissionPlans.effectiveTo,
      isActive: commissionPlans.isActive,
      createdAt: commissionPlans.createdAt,
    })
    .from(commissionPlans)
    .leftJoin(branches, eq(commissionPlans.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(commissionPlans.isActive), asc(commissionPlans.name));
};

export const createCommissionPlanTransaction = async (
  tenantId: number,
  input: CreateCommissionPlanInput,
  actor: CommissionAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(commissionPlans)
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

    await tx.insert(auditLogs).values({
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

export const updateCommissionPlanTransaction = async (
  tenantId: number,
  planId: number,
  input: UpdateCommissionPlanInput,
  actor: CommissionAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(commissionPlans)
      .where(and(eq(commissionPlans.id, planId), eq(commissionPlans.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;

    const [updated] = await tx
      .update(commissionPlans)
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
      .where(and(eq(commissionPlans.id, planId), eq(commissionPlans.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
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

/**
 * Live Commission Computation Engine:
 * Evaluates all active commission_plans against real settled orders, order_items, and refunds.
 */
export const computeLiveCommissions = async (
  tenantId: number,
  periodStart: string,
  periodEnd: string,
  effectiveBranchIds: number[] | null
) => {
  const startTs = new Date(`${periodStart}T00:00:00.000Z`);
  const endTs = new Date(`${periodEnd}T23:59:59.999Z`);

  const planConditions: SQL[] = [
    eq(commissionPlans.tenantId, tenantId),
    eq(commissionPlans.isActive, true),
    lte(commissionPlans.effectiveFrom, periodEnd),
  ];

  const orderConditions: SQL[] = [
    eq(orders.tenantId, tenantId),
    gte(orders.createdAt, startTs),
    lte(orders.createdAt, endTs),
    notInArray(orders.status, ['Cancelled', 'Draft']),
  ];

  const refundConditions: SQL[] = [
    eq(refunds.tenantId, tenantId),
    eq(refunds.refundFlow, 'AR_CUSTOMER_REFUND'),
    notInArray(refunds.status, ['CANCELLED']),
    gte(refunds.createdAt, startTs),
    lte(refunds.createdAt, endTs),
  ];

  if (effectiveBranchIds !== null) {
    if (effectiveBranchIds.length === 0) {
      return { currency: 'KES', lines: [] as ComputedCommissionLine[] };
    }
    orderConditions.push(inArray(orders.branchId, effectiveBranchIds));
    refundConditions.push(inArray(refunds.branchId, effectiveBranchIds));
  }

  const [plans, rawOrderLines, refundRows, staffRows, [finSettings]] = await Promise.all([
    db.select().from(commissionPlans).where(and(...planConditions)),

    db
      .select({
        orderId: orders.id,
        branchId: orders.branchId,
        waiterId: orders.waiterId,
        cashierId: orders.cashierId,
        orderSubtotal: orders.subtotal,
        orderDiscount: orders.discountTotal,
        orderTotal: orders.total,
        menuItemId: orderItems.menuItemId,
        categoryId: menuItems.categoryId,
        quantity: orderItems.quantity,
        totalPrice: orderItems.totalPrice,
        unitCostSnapshot: orderItems.unitCostSnapshot,
      })
      .from(orderItems)
      .innerJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.tenantId, tenantId)))
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(eq(orderItems.tenantId, tenantId), ...orderConditions)),

    db
      .select({
        orderId: refunds.orderId,
        amount: refunds.amount,
        waiterId: orders.waiterId,
        cashierId: orders.cashierId,
      })
      .from(refunds)
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(and(...refundConditions)),

    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
        branchName: branches.name,
      })
      .from(users)
      .leftJoin(branches, eq(users.defaultBranchId, branches.id))
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true))),

    db
      .select({ baseCurrency: tenantFinancialSettings.baseCurrency })
      .from(tenantFinancialSettings)
      .where(eq(tenantFinancialSettings.tenantId, tenantId))
      .limit(1),
  ]);

  const staffMap = new Map(staffRows.map((s) => [s.id, s]));
  const lines: ComputedCommissionLine[] = [];

  for (const plan of plans) {
    if (plan.effectiveTo && plan.effectiveTo < periodStart) continue;

    // Accumulate qualifying metrics per staff member for this plan
    const bucket = new Map<
      number,
      { orderIds: Set<number>; sales: number; units: number; refundSales: number }
    >();

    for (const row of rawOrderLines) {
      if (plan.branchId && row.branchId !== plan.branchId) continue;
      if (plan.productScope === 'CATEGORY' && row.categoryId !== plan.menuCategoryId) continue;
      if (plan.productScope === 'MENU_ITEM' && row.menuItemId !== plan.menuItemId) continue;

      const attributedUserId =
        plan.attributionMode === 'WAITER_ONLY'
          ? row.waiterId
          : plan.attributionMode === 'CASHIER_ONLY'
            ? row.cashierId
            : row.waiterId ?? row.cashierId;

      if (!attributedUserId) continue;
      const staff = staffMap.get(attributedUserId);
      if (!staff) continue;

      if (plan.targetUserId && staff.id !== plan.targetUserId) continue;
      if (plan.targetRole && staff.role !== plan.targetRole) continue;

      const qty = parseFloat(row.quantity) || 0;
      const lineTotal = parseFloat(row.totalPrice) || 0;
      const lineCost = qty * (parseFloat(row.unitCostSnapshot) || 0);

      let basisValue = lineTotal;
      if (plan.basisType === 'GROSS_MARGIN') {
        basisValue = Math.max(0, lineTotal - lineCost);
      } else if (plan.basisType === 'NET_SALES') {
        // Pro-rate net pre-tax ratio from parent order
        const orderTotal = parseFloat(row.orderTotal) || 0;
        const orderNet = Math.max(
          0,
          (parseFloat(row.orderSubtotal) || 0) - (parseFloat(row.orderDiscount) || 0)
        );
        const netRatio = orderTotal > 0 ? orderNet / orderTotal : 1;
        basisValue = lineTotal * netRatio;
      }

      const acc = bucket.get(staff.id) ?? {
        orderIds: new Set<number>(),
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
        const attributedUserId =
          plan.attributionMode === 'WAITER_ONLY'
            ? ref.waiterId
            : plan.attributionMode === 'CASHIER_ONLY'
              ? ref.cashierId
              : ref.waiterId ?? ref.cashierId;

        if (!attributedUserId) continue;
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
      if (!staff) continue;
      if (acc.sales < minHurdle) continue;

      let grossComm = 0;
      let rateLabel = '';

      if (plan.rateType === 'FLAT_PER_UNIT') {
        grossComm = acc.units * flatRate;
        rateLabel = `${finSettings?.baseCurrency ?? 'KES'} ${flatRate}/unit`;
      } else if (plan.rateType === 'TIERED_ACCELERATOR') {
        const tiered = calculateTieredAmount(acc.sales, plan.tiers ?? []);
        grossComm = tiered.commission;
        rateLabel = tiered.label;
      } else {
        grossComm = (acc.sales * flatRate) / 100;
        rateLabel = `${flatRate}%`;
      }

      const clawbackAmt =
        plan.clawbackOnRefund && acc.refundSales > 0 && plan.rateType !== 'FLAT_PER_UNIT'
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

export const generatePayoutRunTransaction = async (
  tenantId: number,
  periodStart: string,
  periodEnd: string,
  branchId: number | null,
  effectiveBranchIds: number[] | null,
  notes: string | null,
  actor: CommissionAuditActor
) => {
  const { currency, lines } = await computeLiveCommissions(
    tenantId,
    periodStart,
    periodEnd,
    effectiveBranchIds
  );

  if (lines.length === 0) {
    throw new Error('No qualifying commission earnings found for the selected period and scope.');
  }

  return await db.transaction(async (tx) => {
    const runNumber = `COM-${periodEnd.replace(/-/g, '').slice(0, 6)}-${Date.now().toString().slice(-4)}`;
    const uniqueUsers = new Set(lines.map((l) => l.userId)).size;
    const totalSales = lines.reduce((s, l) => s + l.qualifyingSales, 0);
    const totalGross = lines.reduce((s, l) => s + l.grossCommission, 0);
    const totalClawbacks = lines.reduce((s, l) => s + l.clawbackAmount, 0);
    const netPayable = lines.reduce((s, l) => s + l.netCommission, 0);

    const [run] = await tx
      .insert(commissionPayoutRuns)
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

    await tx.insert(commissionLedgerEntries).values(
      lines.map((l) => ({
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
      }))
    );

    await tx.insert(auditLogs).values({
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

export const approvePayoutRunTransaction = async (
  tenantId: number,
  runId: number,
  actor: CommissionAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(commissionPayoutRuns)
      .where(and(eq(commissionPayoutRuns.id, runId), eq(commissionPayoutRuns.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;
    if (existing.status !== 'DRAFT') {
      throw new Error('Only DRAFT commission runs can be approved.');
    }
    if (
      existing.createdById === actor.userId &&
      actor.role !== 'ADMIN' &&
      actor.role !== 'SUPER_ADMIN'
    ) {
      throw new Error('Maker-checker governance: Another supervisor must approve this payout run.');
    }

    const [approved] = await tx
      .update(commissionPayoutRuns)
      .set({
        status: 'APPROVED',
        approvedByUserId: actor.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(commissionPayoutRuns.id, runId))
      .returning();

    await tx
      .update(commissionLedgerEntries)
      .set({ status: 'APPROVED' })
      .where(eq(commissionLedgerEntries.payoutRunId, runId));

    await tx.insert(auditLogs).values({
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

export const settlePayoutRunTransaction = async (
  tenantId: number,
  runId: number,
  input: SettlePayoutRunInput,
  actor: CommissionAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(commissionPayoutRuns)
      .where(and(eq(commissionPayoutRuns.id, runId), eq(commissionPayoutRuns.tenantId, tenantId)))
      .limit(1);

    if (!existing) return null;
    if (existing.status !== 'APPROVED') {
      throw new Error('Commission run must be APPROVED before disbursement.');
    }

    const [paid] = await tx
      .update(commissionPayoutRuns)
      .set({
        status: 'PAID',
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        paidAt: new Date(),
        notes: input.notes ?? existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(commissionPayoutRuns.id, runId))
      .returning();

    const entries = await tx
      .update(commissionLedgerEntries)
      .set({ status: 'PAID' })
      .where(eq(commissionLedgerEntries.payoutRunId, runId))
      .returning({ userId: commissionLedgerEntries.userId, netCommission: commissionLedgerEntries.netCommission });

    // Notify each associate of their disbursed commission
    const byUser = new Map<number, number>();
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
      await tx.insert(notifications).values(notifRows);
    }

    await tx.insert(auditLogs).values({
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

export const listPayoutRuns = async (
  tenantId: number,
  effectiveBranchIds: number[] | null
) => {
  const conditions: SQL[] = [eq(commissionPayoutRuns.tenantId, tenantId)];
  if (effectiveBranchIds !== null) {
    if (effectiveBranchIds.length === 0) return [];
    const scope = or(
      isNull(commissionPayoutRuns.branchId),
      inArray(commissionPayoutRuns.branchId, effectiveBranchIds)
    );
    if (scope) conditions.push(scope);
  }

  return await db
    .select()
    .from(commissionPayoutRuns)
    .where(and(...conditions))
    .orderBy(desc(commissionPayoutRuns.createdAt))
    .limit(100);
};