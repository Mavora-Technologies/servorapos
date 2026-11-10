import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../config/db';
import {
  financialAdjustments,
  cashierShifts,
  users,
  branches,
  notifications,
} from '../config/schema';
import {
  ListAdjustmentsQuery,
  CreateAdjustmentInput,
  ReviewAdjustmentInput,
} from '../validators/adjustments.validator';

export const getAdjustmentsMetrics = async (tenantId: number, branchId?: number) => {
  const branchCondition = branchId ? eq(financialAdjustments.branchId, branchId) : undefined;

  const [metrics] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      pendingCount: sql<number>`count(case when ${financialAdjustments.status} = 'PENDING_APPROVAL' then 1 end)::int`,
      pendingAmountKes: sql<number>`coalesce(sum(case when ${financialAdjustments.status} = 'PENDING_APPROVAL' then ${financialAdjustments.amount} else 0 end), 0)::numeric`,
      approvedPostedKes: sql<number>`coalesce(sum(case when ${financialAdjustments.status} in ('APPROVED', 'POSTED') then ${financialAdjustments.amount} else 0 end), 0)::numeric`,
      rejectedCount: sql<number>`count(case when ${financialAdjustments.status} = 'REJECTED' then 1 end)::int`,
      tillWriteOffsKes: sql<number>`coalesce(sum(case when ${financialAdjustments.adjustmentType} = 'TILL_VARIANCE_WRITE_OFF' and ${financialAdjustments.status} in ('APPROVED', 'POSTED') then ${financialAdjustments.amount} else 0 end), 0)::numeric`,
    })
    .from(financialAdjustments)
    .where(and(eq(financialAdjustments.tenantId, tenantId), branchCondition));

  return {
    totalCount: Number(metrics?.totalCount || 0),
    pendingCount: Number(metrics?.pendingCount || 0),
    pendingAmountKes: Number(metrics?.pendingAmountKes || 0),
    approvedPostedKes: Number(metrics?.approvedPostedKes || 0),
    rejectedCount: Number(metrics?.rejectedCount || 0),
    tillWriteOffsKes: Number(metrics?.tillWriteOffsKes || 0),
  };
};

export const listTenantAdjustments = async (tenantId: number, query: ListAdjustmentsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(financialAdjustments.tenantId, tenantId),
    query.branchId ? eq(financialAdjustments.branchId, query.branchId) : undefined,
    query.status && query.status !== 'ALL' ? eq(financialAdjustments.status, query.status) : undefined,
    query.adjustmentType && query.adjustmentType !== 'ALL'
      ? eq(financialAdjustments.adjustmentType, query.adjustmentType)
      : undefined,
    query.search
      ? or(
          ilike(financialAdjustments.adjustmentNumber, `%${query.search}%`),
          ilike(financialAdjustments.justificationNotes, `%${query.search}%`),
          ilike(financialAdjustments.reasonCode, `%${query.search}%`),
          ilike(financialAdjustments.debitGlAccount, `%${query.search}%`),
          ilike(financialAdjustments.creditGlAccount, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  // Define aliases for multiple joins to the users table
  const maker = alias(users, 'maker');
  const checker = alias(users, 'checker');
  const staff = alias(users, 'staff');

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(financialAdjustments)
      .where(and(...conditions)),
    db
      .select({
        id: financialAdjustments.id,
        adjustmentNumber: financialAdjustments.adjustmentNumber,
        adjustmentType: financialAdjustments.adjustmentType,
        amount: financialAdjustments.amount,
        currency: financialAdjustments.currency,
        adjustmentDirection: financialAdjustments.adjustmentDirection,
        debitGlAccount: financialAdjustments.debitGlAccount,
        creditGlAccount: financialAdjustments.creditGlAccount,
        status: financialAdjustments.status,
        reasonCode: financialAdjustments.reasonCode,
        justificationNotes: financialAdjustments.justificationNotes,
        supportingDocumentUrl: financialAdjustments.supportingDocumentUrl,
        rejectionReason: financialAdjustments.rejectionReason,
        shiftId: financialAdjustments.shiftId,
        createdAt: financialAdjustments.createdAt,
        approvedAt: financialAdjustments.approvedAt,
        postedAt: financialAdjustments.postedAt,
        branchName: branches.name,
        createdByName: sql<string>`TRIM(CONCAT(${maker.firstName}, ' ', ${maker.lastName}))`,
        createdByEmail: maker.email,
        approverName: sql<string | null>`TRIM(CONCAT(${checker.firstName}, ' ', ${checker.lastName}))`,
        attributedStaffName: sql<string | null>`TRIM(CONCAT(${staff.firstName}, ' ', ${staff.lastName}))`,
      })
      .from(financialAdjustments)
      .leftJoin(branches, eq(financialAdjustments.branchId, branches.id))
      .leftJoin(maker, eq(financialAdjustments.createdById, maker.id))
      .leftJoin(checker, eq(financialAdjustments.approvedByUserId, checker.id))
      .leftJoin(staff, eq(financialAdjustments.attributedUserId, staff.id))
      .where(and(...conditions))
      .orderBy(desc(financialAdjustments.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    adjustments: rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createAdjustmentVoucher = async (
  tenantId: number,
  userId: number,
  input: CreateAdjustmentInput
) => {
  return await db.transaction(async (tx) => {
    // Generate sequential adjustment voucher number (ADJ-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const [countResult] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(financialAdjustments)
      .where(eq(financialAdjustments.tenantId, tenantId));

    const nextSeq = String((countResult?.count || 0) + 1).padStart(4, '0');
    const adjustmentNumber = `ADJ-${currentYear}-${nextSeq}`;

    const [created] = await tx
      .insert(financialAdjustments)
      .values({
        tenantId,
        branchId: input.branchId || null,
        adjustmentNumber,
        adjustmentType: input.adjustmentType,
        shiftId: input.shiftId || null,
        attributedUserId: input.attributedUserId || null,
        createdById: userId,
        amount: input.amount.toFixed(2),
        currency: 'KES',
        adjustmentDirection: input.adjustmentDirection,
        debitGlAccount: input.debitGlAccount,
        creditGlAccount: input.creditGlAccount,
        reasonCode: input.reasonCode,
        justificationNotes: input.justificationNotes,
        supportingDocumentUrl: input.supportingDocumentUrl || null,
        status: 'PENDING_APPROVAL',
      })
      .returning();

    // Trigger Workday Maker-Checker actionable escalation notification
    await tx.insert(notifications).values({
      tenantId,
      branchId: input.branchId || null,
      title: `Adjustment Approval Requested: ${adjustmentNumber}`,
      detail: `Operator proposed a ${input.adjustmentType.replace(/_/g, ' ')} of KES ${input.amount.toLocaleString()}. Two-person integrity sign-off required.`,
      severity: 'WARNING',
      module: 'FINANCE',
      category: 'ACTION_REQUIRED',
      entityType: 'financial_adjustments',
      entityId: String(created.id),
      actionUrl: '/finance/adjustments',
      actionPayload: {
        actionCode: 'APPROVE_FINANCIAL_ADJUSTMENT',
        buttonLabel: 'Review Adjustment',
      },
      isRead: false,
      isResolved: false,
    });

    return created;
  });
};

export const reviewAdjustmentVoucher = async (
  tenantId: number,
  supervisorId: number,
  adjustmentId: number,
  input: ReviewAdjustmentInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(financialAdjustments)
      .where(
        and(
          eq(financialAdjustments.id, adjustmentId),
          eq(financialAdjustments.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) throw new Error('Financial adjustment voucher not found');

    // Prevent maker from checking their own entry (Maker-Checker segregation of duties)
    if (existing.createdById === supervisorId) {
      throw new Error('Maker-Checker Violation: You cannot approve or post an adjustment you created.');
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (input.action === 'APPROVE') {
      updateData.status = 'APPROVED';
      updateData.approvedByUserId = supervisorId;
      updateData.approvedAt = new Date();
      updateData.rejectionReason = null;
    } else if (input.action === 'REJECT') {
      updateData.status = 'REJECTED';
      updateData.approvedByUserId = supervisorId;
      updateData.rejectionReason = input.rejectionReason || 'Declined by financial controller.';
    } else if (input.action === 'POST') {
      updateData.status = 'POSTED';
      updateData.postedAt = new Date();
    }

    const [updated] = await tx
      .update(financialAdjustments)
      .set(updateData)
      .where(eq(financialAdjustments.id, adjustmentId))
      .returning();

    return updated;
  });
};