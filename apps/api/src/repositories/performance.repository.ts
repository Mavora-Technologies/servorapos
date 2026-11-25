// apps/api/src/repositories/performance.repository.ts
import {
  eq,
  and,
  desc,
  asc,
  sql,
  gte,
  lte,
  inArray,
  notInArray,
  or,
  isNull,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../config/db';
import {
  staffPerformanceReviews,
  users,
  branches,
  roles,
  userBranchMemberships,
  orders,
  refunds,
  cashierShifts,
  attendanceRecords,
  customerFeedback,
  tenantFinancialSettings,
  auditLogs,
  notifications,
} from '../config/schema';
import type { CreateReviewInput, UpdateReviewInput } from '../validators/performance.validator';

export interface PerformanceAuditActor {
  userId: number;
  ipAddress?: string | null;
}

export interface ScopedPerformanceFilters {
  cycle?: string;
  role?: string;
  userId?: number;
  effectiveBranchIds: number[] | null;
  status?: string;
  minRating?: number;
  startDate?: string;
  endDate?: string;
}

export interface ScopedTelemetryFilters {
  authorizedBranchIds: number[] | null;
  effectiveBranchIds: number[] | null;
  role?: string;
  startDate?: string;
  endDate?: string;
}

function parseStartTs(dateStr?: string): Date {
  if (dateStr) return new Date(`${dateStr}T00:00:00.000Z`);
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseEndTs(dateStr?: string): Date {
  if (dateStr) return new Date(`${dateStr}T23:59:59.999Z`);
  return new Date();
}

export const listPerformanceReviews = async (
  tenantId: number,
  filters: ScopedPerformanceFilters
) => {
  const reviewer = alias(users, 'reviewer');

  const conditions: SQL[] = [eq(staffPerformanceReviews.tenantId, tenantId)];

  if (filters.cycle) conditions.push(eq(staffPerformanceReviews.reviewCycle, filters.cycle));
  if (filters.role) conditions.push(eq(users.role, filters.role));
  if (filters.userId) conditions.push(eq(staffPerformanceReviews.userId, filters.userId));
  if (filters.status) conditions.push(eq(staffPerformanceReviews.status, filters.status));
  if (filters.minRating !== undefined) {
    conditions.push(sql`${staffPerformanceReviews.overallRating}::numeric >= ${filters.minRating}`);
  }
  if (filters.startDate) {
    conditions.push(gte(staffPerformanceReviews.periodStart, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(staffPerformanceReviews.periodEnd, filters.endDate));
  }

  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) return [];
    const memberSubquery = db
      .select({ userId: userBranchMemberships.userId })
      .from(userBranchMemberships)
      .where(
        and(
          eq(userBranchMemberships.tenantId, tenantId),
          eq(userBranchMemberships.isActive, true),
          inArray(userBranchMemberships.branchId, filters.effectiveBranchIds)
        )
      );
    const branchMatch = or(
      inArray(users.defaultBranchId, filters.effectiveBranchIds),
      inArray(users.id, memberSubquery)
    );
    if (branchMatch) conditions.push(branchMatch);
  }

  return await db
    .select({
      id: staffPerformanceReviews.id,
      userId: staffPerformanceReviews.userId,
      employeeName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      employeeRole: users.role,
      employeeEmail: users.email,
      branchId: users.defaultBranchId,
      branchName: branches.name,
      reviewerId: staffPerformanceReviews.reviewerId,
      reviewerName: sql<string | null>`NULLIF(TRIM(CONCAT(${reviewer.firstName}, ' ', ${reviewer.lastName})), '')`,
      reviewCycle: staffPerformanceReviews.reviewCycle,
      periodStart: staffPerformanceReviews.periodStart,
      periodEnd: staffPerformanceReviews.periodEnd,
      overallRating: staffPerformanceReviews.overallRating,
      totalSalesGenerated: staffPerformanceReviews.totalSalesGenerated,
      salesTarget: staffPerformanceReviews.salesTarget,
      averageTicketValue: staffPerformanceReviews.averageTicketValue,
      speedOfServiceMinutes: staffPerformanceReviews.speedOfServiceMinutes,
      attendanceScorePercent: staffPerformanceReviews.attendanceScorePercent,
      voidRefundCount: staffPerformanceReviews.voidRefundCount,
      tipPoolAllocated: staffPerformanceReviews.tipPoolAllocated,
      competencies: staffPerformanceReviews.competencies,
      goals: staffPerformanceReviews.goals,
      managerFeedback: staffPerformanceReviews.managerFeedback,
      employeeFeedback: staffPerformanceReviews.employeeFeedback,
      status: staffPerformanceReviews.status,
      acknowledgedAt: staffPerformanceReviews.acknowledgedAt,
      createdAt: staffPerformanceReviews.createdAt,
    })
    .from(staffPerformanceReviews)
    .innerJoin(
      users,
      and(eq(staffPerformanceReviews.userId, users.id), eq(users.tenantId, tenantId))
    )
    .leftJoin(branches, eq(users.defaultBranchId, branches.id))
    .leftJoin(reviewer, eq(staffPerformanceReviews.reviewerId, reviewer.id))
    .where(and(...conditions))
    .orderBy(desc(staffPerformanceReviews.periodEnd), desc(staffPerformanceReviews.id))
    .limit(200);
};

export const findReviewById = async (tenantId: number, reviewId: number) => {
  const [row] = await db
    .select({
      id: staffPerformanceReviews.id,
      userId: staffPerformanceReviews.userId,
      reviewerId: staffPerformanceReviews.reviewerId,
      status: staffPerformanceReviews.status,
      employeeDefaultBranchId: users.defaultBranchId,
    })
    .from(staffPerformanceReviews)
    .innerJoin(users, eq(staffPerformanceReviews.userId, users.id))
    .where(
      and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
    )
    .limit(1);

  return row ?? null;
};

/**
 * 360-Degree Live Operational KPI Telemetry:
 * Orders (Sales, ATV, Discounts, Voids), Refunds, Cashier Shifts (Cash Variance),
 * Attendance (Hours, Overtime, Punctuality), Guest CSAT, and Multi-Branch Productivity Matrix.
 */
export const getLiveStaffTelemetry = async (
  tenantId: number,
  filters: ScopedTelemetryFilters
) => {
  const startTs = parseStartTs(filters.startDate);
  const endTs = parseEndTs(filters.endDate);

  const staffConditions: SQL[] = [eq(users.tenantId, tenantId), eq(users.isActive, true)];
  if (filters.role) {
    staffConditions.push(eq(users.role, filters.role));
  }
  if (filters.effectiveBranchIds !== null) {
    if (filters.effectiveBranchIds.length === 0) {
      staffConditions.push(sql`FALSE`);
    } else {
      const memberSubquery = db
        .select({ userId: userBranchMemberships.userId })
        .from(userBranchMemberships)
        .where(
          and(
            eq(userBranchMemberships.tenantId, tenantId),
            eq(userBranchMemberships.isActive, true),
            inArray(userBranchMemberships.branchId, filters.effectiveBranchIds)
          )
        );
      const staffBranchMatch = or(
        inArray(users.defaultBranchId, filters.effectiveBranchIds),
        inArray(users.id, memberSubquery)
      );
      if (staffBranchMatch) staffConditions.push(staffBranchMatch);
    }
  }

  const branchDropdownConditions: SQL[] = [
    eq(branches.tenantId, tenantId),
    eq(branches.isActive, true),
  ];
  if (filters.authorizedBranchIds !== null) {
    if (filters.authorizedBranchIds.length === 0) branchDropdownConditions.push(sql`FALSE`);
    else branchDropdownConditions.push(inArray(branches.id, filters.authorizedBranchIds));
  }

  const branchFilter = <T>(col: T): SQL | undefined => {
    if (filters.effectiveBranchIds === null) return undefined;
    if (filters.effectiveBranchIds.length === 0) return sql`FALSE`;
    return inArray(col as never, filters.effectiveBranchIds);
  };

  const [
    staffList,
    authorizedBranches,
    tenantRoles,
    orderStatsRows,
    refundStatsRows,
    shiftVarianceRows,
    attendanceRows,
    feedbackRows,
    [finSettings],
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        email: users.email,
        defaultBranchId: users.defaultBranchId,
        branchName: branches.name,
        branchCode: branches.code,
      })
      .from(users)
      .leftJoin(branches, eq(users.defaultBranchId, branches.id))
      .where(and(...staffConditions))
      .orderBy(asc(users.firstName), asc(users.lastName)),

    db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        isMainBranch: branches.isMainBranch,
      })
      .from(branches)
      .where(and(...branchDropdownConditions))
      .orderBy(desc(branches.isMainBranch), asc(branches.name)),

    db
      .select({ id: roles.id, name: roles.name, slug: roles.slug })
      .from(roles)
      .where(
        or(eq(roles.tenantId, tenantId), and(eq(roles.isSystemRole, true), isNull(roles.tenantId)))
      )
      .orderBy(asc(roles.name)),

    // 1. Real POS Orders (Sales, Discounts, Completed, Cancelled)
    db
      .select({
        staffId: sql<number>`COALESCE(${orders.cashierId}, ${orders.waiterId})`,
        totalSales: sql<number>`coalesce(sum(case when ${orders.status} not in ('Cancelled', 'Draft') then ${orders.total}::numeric else 0 end), 0)::float`,
        discountTotal: sql<number>`coalesce(sum(case when ${orders.status} not in ('Cancelled', 'Draft') then ${orders.discountTotal}::numeric else 0 end), 0)::float`,
        completedOrders: sql<number>`count(case when ${orders.status} not in ('Cancelled', 'Draft') then 1 end)::int`,
        cancelledOrders: sql<number>`count(case when ${orders.status} = 'Cancelled' then 1 end)::int`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          gte(orders.createdAt, startTs),
          lte(orders.createdAt, endTs),
          branchFilter(orders.branchId),
          sql`COALESCE(${orders.cashierId}, ${orders.waiterId}) IS NOT NULL`
        )
      )
      .groupBy(sql`COALESCE(${orders.cashierId}, ${orders.waiterId})`),

    // 2. Real Refunds
    db
      .select({
        staffId: refunds.processedById,
        refundCount: sql<number>`count(*)::int`,
      })
      .from(refunds)
      .where(
        and(
          eq(refunds.tenantId, tenantId),
          gte(refunds.createdAt, startTs),
          lte(refunds.createdAt, endTs),
          branchFilter(refunds.branchId),
          notInArray(refunds.status, ['CANCELLED']),
          sql`${refunds.processedById} IS NOT NULL`
        )
      )
      .groupBy(refunds.processedById),

    // 3. Real Cashier Shift Cash Variances
    db
      .select({
        cashierId: cashierShifts.cashierId,
        closedShifts: sql<number>`count(case when ${cashierShifts.status} = 'CLOSED' then 1 end)::int`,
        netCashVariance: sql<number>`coalesce(sum(case when ${cashierShifts.status} = 'CLOSED' then coalesce(${cashierShifts.variance}::numeric, 0) else 0 end), 0)::float`,
      })
      .from(cashierShifts)
      .where(
        and(
          eq(cashierShifts.tenantId, tenantId),
          gte(cashierShifts.openedAt, startTs),
          lte(cashierShifts.openedAt, endTs),
          branchFilter(cashierShifts.branchId)
        )
      )
      .groupBy(cashierShifts.cashierId),

    // 4. Real Attendance (Punctuality, Hours, Overtime)
    db
      .select({
        userId: attendanceRecords.userId,
        totalShifts: sql<number>`count(*)::int`,
        onTimeShifts: sql<number>`count(case when ${attendanceRecords.verificationStatus} = 'VERIFIED' then 1 end)::int`,
        totalMinutes: sql<number>`coalesce(sum(${attendanceRecords.totalDurationMinutes}), 0)::int`,
        overtimeHours: sql<number>`coalesce(sum(${attendanceRecords.overtimeHours}::numeric), 0)::float`,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          gte(attendanceRecords.clockInAt, startTs),
          lte(attendanceRecords.clockInAt, endTs),
          branchFilter(attendanceRecords.branchId)
        )
      )
      .groupBy(attendanceRecords.userId),

    // 5. Real Guest Feedback / CSAT
    db
      .select({
        staffId: customerFeedback.staffId,
        avgRating: sql<number>`coalesce(avg(${customerFeedback.rating}), 0)::float`,
        feedbackCount: sql<number>`count(*)::int`,
      })
      .from(customerFeedback)
      .where(
        and(
          eq(customerFeedback.tenantId, tenantId),
          gte(customerFeedback.createdAt, startTs),
          lte(customerFeedback.createdAt, endTs),
          branchFilter(customerFeedback.branchId),
          sql`${customerFeedback.staffId} IS NOT NULL`
        )
      )
      .groupBy(customerFeedback.staffId),

    db
      .select({
        baseCurrency: tenantFinancialSettings.baseCurrency,
        tipDistributionModel: tenantFinancialSettings.tipDistributionModel,
      })
      .from(tenantFinancialSettings)
      .where(eq(tenantFinancialSettings.tenantId, tenantId))
      .limit(1),
  ]);

  const orderMap = new Map(orderStatsRows.map((o) => [Number(o.staffId), o]));
  const refundMap = new Map(refundStatsRows.map((r) => [Number(r.staffId), r.refundCount]));
  const shiftVarMap = new Map(shiftVarianceRows.map((s) => [s.cashierId, s]));
  const attMap = new Map(attendanceRows.map((a) => [a.userId, a]));
  const fbMap = new Map(feedbackRows.map((f) => [Number(f.staffId), f]));

  const telemetry = staffList.map((member) => {
    const ord = orderMap.get(member.id);
    const refundCount = refundMap.get(member.id) ?? 0;
    const sv = shiftVarMap.get(member.id);
    const att = attMap.get(member.id);
    const fb = fbMap.get(member.id);

    const totalSales = Number((ord?.totalSales ?? 0).toFixed(2));
    const discountTotal = Number((ord?.discountTotal ?? 0).toFixed(2));
    const completedOrders = ord?.completedOrders ?? 0;
    const cancelledOrders = ord?.cancelledOrders ?? 0;
    const averageTicketValue =
      completedOrders > 0 ? Number((totalSales / completedOrders).toFixed(2)) : 0;
    const discountRatePct =
      totalSales + discountTotal > 0
        ? Number(((discountTotal / (totalSales + discountTotal)) * 100).toFixed(1))
        : 0;

    const totalShifts = att?.totalShifts ?? 0;
    const onTimeShifts = att?.onTimeShifts ?? 0;
    const attendanceScore =
      totalShifts > 0 ? Math.round((onTimeShifts / totalShifts) * 100) : null;
    const hoursWorked = Number(((att?.totalMinutes ?? 0) / 60).toFixed(1));
    const overtimeHours = Number((att?.overtimeHours ?? 0).toFixed(1));
    const salesPerLaborHour =
      hoursWorked > 0 ? Number((totalSales / hoursWorked).toFixed(2)) : 0;

    return {
      userId: member.id,
      employeeName: `${member.firstName} ${member.lastName}`.trim(),
      role: member.role,
      branchId: member.defaultBranchId,
      branchName: member.branchName || 'Unassigned',
      branchCode: member.branchCode || '',
      totalSales,
      discountTotal,
      discountRatePct,
      completedOrders,
      averageTicketValue,
      voidRefundCount: cancelledOrders + refundCount,
      netCashVariance: Number((sv?.netCashVariance ?? 0).toFixed(2)),
      closedTillShifts: sv?.closedShifts ?? 0,
      attendanceScore,
      shiftsWorked: totalShifts,
      hoursWorked,
      overtimeHours,
      salesPerLaborHour,
      csatRating: fb && fb.feedbackCount > 0 ? Number(fb.avgRating.toFixed(1)) : null,
      csatCount: fb?.feedbackCount ?? 0,
    };
  });

  // Aggregate Branch-by-Branch Workforce Productivity Matrix
  const branchAggMap = new Map<
    number,
    {
      branchId: number;
      branchName: string;
      branchCode: string;
      headcount: number;
      totalSales: number;
      totalOrders: number;
      totalHoursWorked: number;
      totalOvertimeHours: number;
      netCashVariance: number;
      voidRefundCount: number;
      csatWeightedSum: number;
      csatCount: number;
    }
  >();

  for (const b of authorizedBranches) {
    branchAggMap.set(b.id, {
      branchId: b.id,
      branchName: b.name,
      branchCode: b.code,
      headcount: 0,
      totalSales: 0,
      totalOrders: 0,
      totalHoursWorked: 0,
      totalOvertimeHours: 0,
      netCashVariance: 0,
      voidRefundCount: 0,
      csatWeightedSum: 0,
      csatCount: 0,
    });
  }

  for (const t of telemetry) {
    if (!t.branchId) continue;
    const agg = branchAggMap.get(t.branchId);
    if (!agg) continue;
    agg.headcount += 1;
    agg.totalSales += t.totalSales;
    agg.totalOrders += t.completedOrders;
    agg.totalHoursWorked += t.hoursWorked;
    agg.totalOvertimeHours += t.overtimeHours;
    agg.netCashVariance += t.netCashVariance;
    agg.voidRefundCount += t.voidRefundCount;
    if (t.csatRating !== null && t.csatCount > 0) {
      agg.csatWeightedSum += t.csatRating * t.csatCount;
      agg.csatCount += t.csatCount;
    }
  }

  const branchProductivity = Array.from(branchAggMap.values())
    .map((b) => ({
      branchId: b.branchId,
      branchName: b.branchName,
      branchCode: b.branchCode,
      headcount: b.headcount,
      totalSales: Number(b.totalSales.toFixed(2)),
      totalOrders: b.totalOrders,
      totalHoursWorked: Number(b.totalHoursWorked.toFixed(1)),
      totalOvertimeHours: Number(b.totalOvertimeHours.toFixed(1)),
      salesPerLaborHour:
        b.totalHoursWorked > 0 ? Number((b.totalSales / b.totalHoursWorked).toFixed(2)) : 0,
      netCashVariance: Number(b.netCashVariance.toFixed(2)),
      voidRefundCount: b.voidRefundCount,
      avgCsat: b.csatCount > 0 ? Number((b.csatWeightedSum / b.csatCount).toFixed(1)) : null,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  return {
    currency: finSettings?.baseCurrency ?? 'KES',
    tipDistributionModel: finSettings?.tipDistributionModel ?? 'HOURS_WEIGHTED',
    branches: authorizedBranches,
    roles: tenantRoles,
    telemetry,
    branchProductivity,
  };
};

export const createReviewTransaction = async (
  tenantId: number,
  reviewerId: number,
  input: CreateReviewInput,
  actor: PerformanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [employee] = await tx
      .select({
        id: users.id,
        defaultBranchId: users.defaultBranchId,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, input.userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!employee || !employee.isActive) {
      throw new Error('Target employee does not exist or is inactive.');
    }

    const [created] = await tx
      .insert(staffPerformanceReviews)
      .values({
        tenantId,
        userId: input.userId,
        reviewerId,
        reviewCycle: input.reviewCycle,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        overallRating: input.overallRating.toFixed(2),
        totalSalesGenerated: input.totalSalesGenerated.toFixed(2),
        salesTarget: input.salesTarget.toFixed(2),
        averageTicketValue: input.averageTicketValue.toFixed(2),
        speedOfServiceMinutes: input.speedOfServiceMinutes.toFixed(1),
        attendanceScorePercent: input.attendanceScorePercent,
        voidRefundCount: input.voidRefundCount,
        tipPoolAllocated: input.tipPoolAllocated.toFixed(2),
        competencies: input.competencies,
        goals: input.goals,
        managerFeedback: input.managerFeedback ?? null,
        status: input.status,
      })
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: employee.defaultBranchId ?? null,
      userId: actor.userId,
      action:
        created.status === 'DRAFT' ? 'STAFF_APPRAISAL_DRAFTED' : 'STAFF_APPRAISAL_CREATED',
      module: 'WORKFORCE_HCM',
      entityType: 'staff_performance_reviews',
      entityId: String(created.id),
      newValues: {
        employeeId: created.userId,
        reviewCycle: created.reviewCycle,
        overallRating: created.overallRating,
        status: created.status,
      },
      ipAddress: actor.ipAddress ?? null,
    });

    if (created.status === 'SUBMITTED') {
      await tx.insert(notifications).values({
        tenantId,
        branchId: employee.defaultBranchId ?? null,
        userId: employee.id,
        title: `New ${created.reviewCycle} Performance Appraisal Ready`,
        detail: `Your ${created.reviewCycle.toLowerCase()} appraisal (${created.periodStart} – ${created.periodEnd}) has been submitted with an overall rating of ${created.overallRating}/5.0. Please review and acknowledge.`,
        severity: 'INFO',
        module: 'WORKFORCE_HCM',
        category: 'ACTION_REQUIRED',
        entityType: 'staff_performance_reviews',
        entityId: String(created.id),
        actionUrl: '/staff/performance',
        isRead: false,
        isResolved: false,
      });
    }

    return created;
  });
};

export const updateReviewTransaction = async (
  tenantId: number,
  reviewId: number,
  input: UpdateReviewInput,
  actor: PerformanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(staffPerformanceReviews)
      .where(
        and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) return null;

    if (existing.status === 'FINALIZED') {
      throw new Error('Immutable Talent Record: Finalized appraisals cannot be altered.');
    }

    const updateSet: Partial<typeof staffPerformanceReviews.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.reviewCycle !== undefined) updateSet.reviewCycle = input.reviewCycle;
    if (input.periodStart !== undefined) updateSet.periodStart = input.periodStart;
    if (input.periodEnd !== undefined) updateSet.periodEnd = input.periodEnd;
    if (input.overallRating !== undefined) updateSet.overallRating = input.overallRating.toFixed(2);
    if (input.totalSalesGenerated !== undefined) {
      updateSet.totalSalesGenerated = input.totalSalesGenerated.toFixed(2);
    }
    if (input.salesTarget !== undefined) updateSet.salesTarget = input.salesTarget.toFixed(2);
    if (input.averageTicketValue !== undefined) {
      updateSet.averageTicketValue = input.averageTicketValue.toFixed(2);
    }
    if (input.speedOfServiceMinutes !== undefined) {
      updateSet.speedOfServiceMinutes = input.speedOfServiceMinutes.toFixed(1);
    }
    if (input.attendanceScorePercent !== undefined) {
      updateSet.attendanceScorePercent = input.attendanceScorePercent;
    }
    if (input.voidRefundCount !== undefined) updateSet.voidRefundCount = input.voidRefundCount;
    if (input.tipPoolAllocated !== undefined) {
      updateSet.tipPoolAllocated = input.tipPoolAllocated.toFixed(2);
    }
    if (input.competencies !== undefined) updateSet.competencies = input.competencies;
    if (input.goals !== undefined) updateSet.goals = input.goals;
    if (input.managerFeedback !== undefined) updateSet.managerFeedback = input.managerFeedback;
    if (input.status !== undefined) updateSet.status = input.status;

    const [updated] = await tx
      .update(staffPerformanceReviews)
      .set(updateSet)
      .where(
        and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
      )
      .returning();

    // Notify employee when transitioning from DRAFT → SUBMITTED
    if (existing.status === 'DRAFT' && updated.status === 'SUBMITTED') {
      await tx.insert(notifications).values({
        tenantId,
        userId: updated.userId,
        title: `New ${updated.reviewCycle} Performance Appraisal Ready`,
        detail: `Your ${updated.reviewCycle.toLowerCase()} appraisal (${updated.periodStart} – ${updated.periodEnd}) has been published with an overall rating of ${updated.overallRating}/5.0.`,
        severity: 'INFO',
        module: 'WORKFORCE_HCM',
        category: 'ACTION_REQUIRED',
        entityType: 'staff_performance_reviews',
        entityId: String(updated.id),
        actionUrl: '/staff/performance',
        isRead: false,
        isResolved: false,
      });
    }

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: null,
      userId: actor.userId,
      action:
        input.status === 'FINALIZED' ? 'STAFF_APPRAISAL_FINALIZED' : 'STAFF_APPRAISAL_UPDATED',
      module: 'WORKFORCE_HCM',
      entityType: 'staff_performance_reviews',
      entityId: String(updated.id),
      previousValues: { status: existing.status, overallRating: existing.overallRating },
      newValues: { status: updated.status, overallRating: updated.overallRating },
      ipAddress: actor.ipAddress ?? null,
    });

    return updated;
  });
};

export const deleteDraftReviewTransaction = async (
  tenantId: number,
  reviewId: number,
  actor: PerformanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(staffPerformanceReviews)
      .where(
        and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) return null;

    if (existing.status !== 'DRAFT') {
      throw new Error(
        'Governance policy: Only DRAFT appraisals can be deleted. Submitted or finalized records are immutable.'
      );
    }

    await tx
      .delete(staffPerformanceReviews)
      .where(
        and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
      );

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: null,
      userId: actor.userId,
      action: 'STAFF_APPRAISAL_DRAFT_DELETED',
      module: 'WORKFORCE_HCM',
      entityType: 'staff_performance_reviews',
      entityId: String(reviewId),
      previousValues: { userId: existing.userId, reviewCycle: existing.reviewCycle },
      ipAddress: actor.ipAddress ?? null,
    });

    return { id: reviewId };
  });
};

export const acknowledgeReviewTransaction = async (
  tenantId: number,
  reviewId: number,
  userId: number,
  employeeFeedback: string | undefined,
  actor: PerformanceAuditActor
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(staffPerformanceReviews)
      .where(
        and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
      )
      .limit(1);

    if (!existing) return null;

    if (existing.userId !== userId) {
      throw new Error(
        'Permission denied: Only the employee receiving this appraisal may submit acknowledgment.'
      );
    }

    if (existing.status === 'FINALIZED') {
      throw new Error('This appraisal has already been finalized.');
    }

    const [acknowledged] = await tx
      .update(staffPerformanceReviews)
      .set({
        status: 'ACKNOWLEDGED',
        employeeFeedback: employeeFeedback ?? existing.employeeFeedback,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(staffPerformanceReviews.id, reviewId), eq(staffPerformanceReviews.tenantId, tenantId))
      )
      .returning();

    await tx
      .update(notifications)
      .set({
        isRead: true,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedByUserId: userId,
      })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.entityType, 'staff_performance_reviews'),
          eq(notifications.entityId, String(reviewId)),
          eq(notifications.isResolved, false)
        )
      );

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: null,
      userId: actor.userId,
      action: 'STAFF_APPRAISAL_ACKNOWLEDGED',
      module: 'WORKFORCE_HCM',
      entityType: 'staff_performance_reviews',
      entityId: String(acknowledged.id),
      reason: employeeFeedback ?? 'Employee digitally acknowledged appraisal',
      ipAddress: actor.ipAddress ?? null,
    });

    return acknowledged;
  });
};