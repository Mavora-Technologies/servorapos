import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../config/db';
import {
  staffPerformanceReviews,
  users,
  attendanceRecords,
  branches,
} from '../config/schema';
import {
  CreateReviewInput,
  UpdateReviewInput,
} from '../validators/performance.validator';

export interface PerformanceFilters {
  cycle?: string;
  userId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const listPerformanceReviews = async (tenantId: number, filters: PerformanceFilters) => {
  // Idiomatic Drizzle table alias for self-joining reviewer from users
  const reviewer = alias(users, 'reviewer');

  const conditions = [
    eq(staffPerformanceReviews.tenantId, tenantId),
    filters.cycle && filters.cycle !== 'ALL' ? eq(staffPerformanceReviews.reviewCycle, filters.cycle) : undefined,
    filters.userId ? eq(staffPerformanceReviews.userId, filters.userId) : undefined,
    filters.status && filters.status !== 'ALL' ? eq(staffPerformanceReviews.status, filters.status) : undefined,
    filters.startDate ? gte(staffPerformanceReviews.periodStart, filters.startDate) : undefined,
    filters.endDate ? lte(staffPerformanceReviews.periodEnd, filters.endDate) : undefined,
  ].filter(Boolean);

  const reviews = await db
    .select({
      id: staffPerformanceReviews.id,
      userId: staffPerformanceReviews.userId,
      employeeName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      employeeRole: users.role,
      employeeEmail: users.email,
      reviewerId: staffPerformanceReviews.reviewerId,
      reviewerName: sql<string>`CONCAT(${reviewer.firstName}, ' ', ${reviewer.lastName})`,
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
    .innerJoin(users, eq(staffPerformanceReviews.userId, users.id))
    .leftJoin(reviewer, eq(staffPerformanceReviews.reviewerId, reviewer.id))
    .where(and(...conditions))
    .orderBy(desc(staffPerformanceReviews.periodEnd), desc(staffPerformanceReviews.id));

  return reviews;
};

export const getLiveStaffTelemetry = async (tenantId: number) => {
  // 1. Aggregate attendance punctuality per employee from attendanceRecords
  const attendanceRaw = await db
    .select({
      userId: attendanceRecords.userId,
      totalShifts: sql<number>`COUNT(${attendanceRecords.id})`,
      onTimeShifts: sql<number>`COUNT(CASE WHEN ${attendanceRecords.verificationStatus} = 'VERIFIED' THEN 1 END)`,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.tenantId, tenantId))
    .groupBy(attendanceRecords.userId);

  // 2. Aggregate baseline sales performance from recorded review appraisals
  const reviewAggRaw = await db
    .select({
      userId: staffPerformanceReviews.userId,
      totalSales: sql<string>`COALESCE(SUM(CAST(${staffPerformanceReviews.totalSalesGenerated} AS NUMERIC)), 0)`,
      avgCheck: sql<string>`COALESCE(AVG(CAST(${staffPerformanceReviews.averageTicketValue} AS NUMERIC)), 0)`,
    })
    .from(staffPerformanceReviews)
    .where(eq(staffPerformanceReviews.tenantId, tenantId))
    .groupBy(staffPerformanceReviews.userId);

  // 3. Retrieve active staff list with assigned branch
  const staffList = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      email: users.email,
      defaultBranchId: users.defaultBranchId,
      branchName: branches.name,
    })
    .from(users)
    .leftJoin(branches, eq(users.defaultBranchId, branches.id))
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .orderBy(users.firstName);

  const attMap = new Map(attendanceRaw.map((a) => [a.userId, a]));
  const reviewMap = new Map(reviewAggRaw.map((r) => [r.userId, r]));

  return staffList.map((member) => {
    const att = attMap.get(member.id);
    const rev = reviewMap.get(member.id);

    const totalShifts = att ? Number(att.totalShifts) : 0;
    const onTimeShifts = att ? Number(att.onTimeShifts) : 0;
    const attendanceReliability = totalShifts > 0 ? Math.round((onTimeShifts / totalShifts) * 100) : 100;

    return {
      userId: member.id,
      employeeName: `${member.firstName} ${member.lastName}`.trim(),
      role: member.role,
      branchName: member.branchName || 'Central Hub',
      totalSales: parseFloat(rev?.totalSales || '0'),
      completedOrders: 0,
      averageTicketValue: parseFloat(rev?.avgCheck || '0'),
      attendanceScore: attendanceReliability,
    };
  });
};

export const createReview = async (
  tenantId: number,
  reviewerId: number,
  input: CreateReviewInput
) => {
  const [created] = await db
    .insert(staffPerformanceReviews)
    .values({
      tenantId,
      userId: input.userId,
      reviewerId,
      reviewCycle: input.reviewCycle,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      overallRating: String(input.overallRating),
      totalSalesGenerated: String(input.totalSalesGenerated),
      salesTarget: String(input.salesTarget),
      averageTicketValue: String(input.averageTicketValue),
      speedOfServiceMinutes: String(input.speedOfServiceMinutes),
      attendanceScorePercent: input.attendanceScorePercent,
      voidRefundCount: input.voidRefundCount,
      tipPoolAllocated: String(input.tipPoolAllocated),
      competencies: input.competencies,
      goals: input.goals,
      managerFeedback: input.managerFeedback,
      status: input.status,
    })
    .returning();

  return created;
};

export const updateReview = async (
  tenantId: number,
  reviewId: number,
  input: UpdateReviewInput
) => {
  const [existing] = await db
    .select({ id: staffPerformanceReviews.id, status: staffPerformanceReviews.status })
    .from(staffPerformanceReviews)
    .where(
      and(
        eq(staffPerformanceReviews.id, reviewId),
        eq(staffPerformanceReviews.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Performance appraisal record not found.');
  }

  if (existing.status === 'FINALIZED') {
    throw new Error('Immutable Talent Record: Finalized appraisals cannot be altered.');
  }

  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (input.overallRating !== undefined) updateData.overallRating = String(input.overallRating);
  if (input.totalSalesGenerated !== undefined) updateData.totalSalesGenerated = String(input.totalSalesGenerated);
  if (input.salesTarget !== undefined) updateData.salesTarget = String(input.salesTarget);
  if (input.averageTicketValue !== undefined) updateData.averageTicketValue = String(input.averageTicketValue);
  if (input.speedOfServiceMinutes !== undefined) updateData.speedOfServiceMinutes = String(input.speedOfServiceMinutes);
  if (input.attendanceScorePercent !== undefined) updateData.attendanceScorePercent = input.attendanceScorePercent;
  if (input.voidRefundCount !== undefined) updateData.voidRefundCount = input.voidRefundCount;
  if (input.tipPoolAllocated !== undefined) updateData.tipPoolAllocated = String(input.tipPoolAllocated);
  if (input.competencies !== undefined) updateData.competencies = input.competencies;
  if (input.goals !== undefined) updateData.goals = input.goals;
  if (input.managerFeedback !== undefined) updateData.managerFeedback = input.managerFeedback;
  if (input.status !== undefined) updateData.status = input.status;

  const [updated] = await db
    .update(staffPerformanceReviews)
    .set(updateData)
    .where(eq(staffPerformanceReviews.id, reviewId))
    .returning();

  return updated;
};

export const acknowledgeReview = async (
  tenantId: number,
  reviewId: number,
  userId: number,
  employeeFeedback?: string
) => {
  const [existing] = await db
    .select({ id: staffPerformanceReviews.id, userId: staffPerformanceReviews.userId })
    .from(staffPerformanceReviews)
    .where(
      and(
        eq(staffPerformanceReviews.id, reviewId),
        eq(staffPerformanceReviews.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new Error('Review record not found.');
  }

  if (existing.userId !== userId) {
    throw new Error('Permission denied: Only the employee receiving this appraisal may submit acknowledgment.');
  }

  const [acknowledged] = await db
    .update(staffPerformanceReviews)
    .set({
      status: 'ACKNOWLEDGED',
      employeeFeedback: employeeFeedback || null,
      acknowledgedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(staffPerformanceReviews.id, reviewId))
    .returning();

  return acknowledged;
};