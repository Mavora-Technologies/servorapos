"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeReview = exports.updateReview = exports.createReview = exports.getLiveStaffTelemetry = exports.listPerformanceReviews = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listPerformanceReviews = async (tenantId, filters) => {
    // Idiomatic Drizzle table alias for self-joining reviewer from users
    const reviewer = (0, pg_core_1.alias)(schema_1.users, 'reviewer');
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId),
        filters.cycle && filters.cycle !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.reviewCycle, filters.cycle) : undefined,
        filters.userId ? (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.userId, filters.userId) : undefined,
        filters.status && filters.status !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.status, filters.status) : undefined,
        filters.startDate ? (0, drizzle_orm_1.gte)(schema_1.staffPerformanceReviews.periodStart, filters.startDate) : undefined,
        filters.endDate ? (0, drizzle_orm_1.lte)(schema_1.staffPerformanceReviews.periodEnd, filters.endDate) : undefined,
    ].filter(Boolean);
    const reviews = await db_1.db
        .select({
        id: schema_1.staffPerformanceReviews.id,
        userId: schema_1.staffPerformanceReviews.userId,
        employeeName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})`,
        employeeRole: schema_1.users.role,
        employeeEmail: schema_1.users.email,
        reviewerId: schema_1.staffPerformanceReviews.reviewerId,
        reviewerName: (0, drizzle_orm_1.sql) `CONCAT(${reviewer.firstName}, ' ', ${reviewer.lastName})`,
        reviewCycle: schema_1.staffPerformanceReviews.reviewCycle,
        periodStart: schema_1.staffPerformanceReviews.periodStart,
        periodEnd: schema_1.staffPerformanceReviews.periodEnd,
        overallRating: schema_1.staffPerformanceReviews.overallRating,
        totalSalesGenerated: schema_1.staffPerformanceReviews.totalSalesGenerated,
        salesTarget: schema_1.staffPerformanceReviews.salesTarget,
        averageTicketValue: schema_1.staffPerformanceReviews.averageTicketValue,
        speedOfServiceMinutes: schema_1.staffPerformanceReviews.speedOfServiceMinutes,
        attendanceScorePercent: schema_1.staffPerformanceReviews.attendanceScorePercent,
        voidRefundCount: schema_1.staffPerformanceReviews.voidRefundCount,
        tipPoolAllocated: schema_1.staffPerformanceReviews.tipPoolAllocated,
        competencies: schema_1.staffPerformanceReviews.competencies,
        goals: schema_1.staffPerformanceReviews.goals,
        managerFeedback: schema_1.staffPerformanceReviews.managerFeedback,
        employeeFeedback: schema_1.staffPerformanceReviews.employeeFeedback,
        status: schema_1.staffPerformanceReviews.status,
        acknowledgedAt: schema_1.staffPerformanceReviews.acknowledgedAt,
        createdAt: schema_1.staffPerformanceReviews.createdAt,
    })
        .from(schema_1.staffPerformanceReviews)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.userId, schema_1.users.id))
        .leftJoin(reviewer, (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.reviewerId, reviewer.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.staffPerformanceReviews.periodEnd), (0, drizzle_orm_1.desc)(schema_1.staffPerformanceReviews.id));
    return reviews;
};
exports.listPerformanceReviews = listPerformanceReviews;
const getLiveStaffTelemetry = async (tenantId) => {
    // 1. Aggregate attendance punctuality per employee from attendanceRecords
    const attendanceRaw = await db_1.db
        .select({
        userId: schema_1.attendanceRecords.userId,
        totalShifts: (0, drizzle_orm_1.sql) `COUNT(${schema_1.attendanceRecords.id})`,
        onTimeShifts: (0, drizzle_orm_1.sql) `COUNT(CASE WHEN ${schema_1.attendanceRecords.verificationStatus} = 'VERIFIED' THEN 1 END)`,
    })
        .from(schema_1.attendanceRecords)
        .where((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId))
        .groupBy(schema_1.attendanceRecords.userId);
    // 2. Aggregate baseline sales performance from recorded review appraisals
    const reviewAggRaw = await db_1.db
        .select({
        userId: schema_1.staffPerformanceReviews.userId,
        totalSales: (0, drizzle_orm_1.sql) `COALESCE(SUM(CAST(${schema_1.staffPerformanceReviews.totalSalesGenerated} AS NUMERIC)), 0)`,
        avgCheck: (0, drizzle_orm_1.sql) `COALESCE(AVG(CAST(${schema_1.staffPerformanceReviews.averageTicketValue} AS NUMERIC)), 0)`,
    })
        .from(schema_1.staffPerformanceReviews)
        .where((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId))
        .groupBy(schema_1.staffPerformanceReviews.userId);
    // 3. Retrieve active staff list with assigned branch
    const staffList = await db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        role: schema_1.users.role,
        email: schema_1.users.email,
        defaultBranchId: schema_1.users.defaultBranchId,
        branchName: schema_1.branches.name,
    })
        .from(schema_1.users)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
        .orderBy(schema_1.users.firstName);
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
exports.getLiveStaffTelemetry = getLiveStaffTelemetry;
const createReview = async (tenantId, reviewerId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.staffPerformanceReviews)
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
exports.createReview = createReview;
const updateReview = async (tenantId, reviewId, input) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.staffPerformanceReviews.id, status: schema_1.staffPerformanceReviews.status })
        .from(schema_1.staffPerformanceReviews)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Performance appraisal record not found.');
    }
    if (existing.status === 'FINALIZED') {
        throw new Error('Immutable Talent Record: Finalized appraisals cannot be altered.');
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.overallRating !== undefined)
        updateData.overallRating = String(input.overallRating);
    if (input.totalSalesGenerated !== undefined)
        updateData.totalSalesGenerated = String(input.totalSalesGenerated);
    if (input.salesTarget !== undefined)
        updateData.salesTarget = String(input.salesTarget);
    if (input.averageTicketValue !== undefined)
        updateData.averageTicketValue = String(input.averageTicketValue);
    if (input.speedOfServiceMinutes !== undefined)
        updateData.speedOfServiceMinutes = String(input.speedOfServiceMinutes);
    if (input.attendanceScorePercent !== undefined)
        updateData.attendanceScorePercent = input.attendanceScorePercent;
    if (input.voidRefundCount !== undefined)
        updateData.voidRefundCount = input.voidRefundCount;
    if (input.tipPoolAllocated !== undefined)
        updateData.tipPoolAllocated = String(input.tipPoolAllocated);
    if (input.competencies !== undefined)
        updateData.competencies = input.competencies;
    if (input.goals !== undefined)
        updateData.goals = input.goals;
    if (input.managerFeedback !== undefined)
        updateData.managerFeedback = input.managerFeedback;
    if (input.status !== undefined)
        updateData.status = input.status;
    const [updated] = await db_1.db
        .update(schema_1.staffPerformanceReviews)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId))
        .returning();
    return updated;
};
exports.updateReview = updateReview;
const acknowledgeReview = async (tenantId, reviewId, userId, employeeFeedback) => {
    const [existing] = await db_1.db
        .select({ id: schema_1.staffPerformanceReviews.id, userId: schema_1.staffPerformanceReviews.userId })
        .from(schema_1.staffPerformanceReviews)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
        .limit(1);
    if (!existing) {
        throw new Error('Review record not found.');
    }
    if (existing.userId !== userId) {
        throw new Error('Permission denied: Only the employee receiving this appraisal may submit acknowledgment.');
    }
    const [acknowledged] = await db_1.db
        .update(schema_1.staffPerformanceReviews)
        .set({
        status: 'ACKNOWLEDGED',
        employeeFeedback: employeeFeedback || null,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId))
        .returning();
    return acknowledged;
};
exports.acknowledgeReview = acknowledgeReview;
