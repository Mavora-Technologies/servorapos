"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acknowledgeReviewTransaction = exports.deleteDraftReviewTransaction = exports.updateReviewTransaction = exports.createReviewTransaction = exports.getLiveStaffTelemetry = exports.findReviewById = exports.listPerformanceReviews = void 0;
// apps/api/src/repositories/performance.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function parseStartTs(dateStr) {
    if (dateStr)
        return new Date(`${dateStr}T00:00:00.000Z`);
    const d = new Date();
    d.setDate(d.getDate() - 29);
    d.setHours(0, 0, 0, 0);
    return d;
}
function parseEndTs(dateStr) {
    if (dateStr)
        return new Date(`${dateStr}T23:59:59.999Z`);
    return new Date();
}
const listPerformanceReviews = async (tenantId, filters) => {
    const reviewer = (0, pg_core_1.alias)(schema_1.users, 'reviewer');
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)];
    if (filters.cycle)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.reviewCycle, filters.cycle));
    if (filters.role)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.users.role, filters.role));
    if (filters.userId)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.userId, filters.userId));
    if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.status, filters.status));
    if (filters.minRating !== undefined) {
        conditions.push((0, drizzle_orm_1.sql) `${schema_1.staffPerformanceReviews.overallRating}::numeric >= ${filters.minRating}`);
    }
    if (filters.startDate) {
        conditions.push((0, drizzle_orm_1.gte)(schema_1.staffPerformanceReviews.periodStart, filters.startDate));
    }
    if (filters.endDate) {
        conditions.push((0, drizzle_orm_1.lte)(schema_1.staffPerformanceReviews.periodEnd, filters.endDate));
    }
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0)
            return [];
        const memberSubquery = db_1.db
            .select({ userId: schema_1.userBranchMemberships.userId })
            .from(schema_1.userBranchMemberships)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.userBranchMemberships.branchId, filters.effectiveBranchIds)));
        const branchMatch = (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.defaultBranchId, filters.effectiveBranchIds), (0, drizzle_orm_1.inArray)(schema_1.users.id, memberSubquery));
        if (branchMatch)
            conditions.push(branchMatch);
    }
    return await db_1.db
        .select({
        id: schema_1.staffPerformanceReviews.id,
        userId: schema_1.staffPerformanceReviews.userId,
        employeeName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        employeeRole: schema_1.users.role,
        employeeEmail: schema_1.users.email,
        branchId: schema_1.users.defaultBranchId,
        branchName: schema_1.branches.name,
        reviewerId: schema_1.staffPerformanceReviews.reviewerId,
        reviewerName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${reviewer.firstName}, ' ', ${reviewer.lastName})), '')`,
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
        .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
        .leftJoin(reviewer, (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.reviewerId, reviewer.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.staffPerformanceReviews.periodEnd), (0, drizzle_orm_1.desc)(schema_1.staffPerformanceReviews.id))
        .limit(200);
};
exports.listPerformanceReviews = listPerformanceReviews;
const findReviewById = async (tenantId, reviewId) => {
    const [row] = await db_1.db
        .select({
        id: schema_1.staffPerformanceReviews.id,
        userId: schema_1.staffPerformanceReviews.userId,
        reviewerId: schema_1.staffPerformanceReviews.reviewerId,
        status: schema_1.staffPerformanceReviews.status,
        employeeDefaultBranchId: schema_1.users.defaultBranchId,
    })
        .from(schema_1.staffPerformanceReviews)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.userId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
        .limit(1);
    return row ?? null;
};
exports.findReviewById = findReviewById;
/**
 * 360-Degree Live Operational KPI Telemetry:
 * Orders (Sales, ATV, Discounts, Voids), Refunds, Cashier Shifts (Cash Variance),
 * Attendance (Hours, Overtime, Punctuality), Guest CSAT, and Multi-Branch Productivity Matrix.
 */
const getLiveStaffTelemetry = async (tenantId, filters) => {
    const startTs = parseStartTs(filters.startDate);
    const endTs = parseEndTs(filters.endDate);
    const staffConditions = [(0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)];
    if (filters.role) {
        staffConditions.push((0, drizzle_orm_1.eq)(schema_1.users.role, filters.role));
    }
    if (filters.effectiveBranchIds !== null) {
        if (filters.effectiveBranchIds.length === 0) {
            staffConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        }
        else {
            const memberSubquery = db_1.db
                .select({ userId: schema_1.userBranchMemberships.userId })
                .from(schema_1.userBranchMemberships)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.userBranchMemberships.isActive, true), (0, drizzle_orm_1.inArray)(schema_1.userBranchMemberships.branchId, filters.effectiveBranchIds)));
            const staffBranchMatch = (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.users.defaultBranchId, filters.effectiveBranchIds), (0, drizzle_orm_1.inArray)(schema_1.users.id, memberSubquery));
            if (staffBranchMatch)
                staffConditions.push(staffBranchMatch);
        }
    }
    const branchDropdownConditions = [
        (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.branches.isActive, true),
    ];
    if (filters.authorizedBranchIds !== null) {
        if (filters.authorizedBranchIds.length === 0)
            branchDropdownConditions.push((0, drizzle_orm_1.sql) `FALSE`);
        else
            branchDropdownConditions.push((0, drizzle_orm_1.inArray)(schema_1.branches.id, filters.authorizedBranchIds));
    }
    const branchFilter = (col) => {
        if (filters.effectiveBranchIds === null)
            return undefined;
        if (filters.effectiveBranchIds.length === 0)
            return (0, drizzle_orm_1.sql) `FALSE`;
        return (0, drizzle_orm_1.inArray)(col, filters.effectiveBranchIds);
    };
    const [staffList, authorizedBranches, tenantRoles, orderStatsRows, refundStatsRows, shiftVarianceRows, attendanceRows, feedbackRows, [finSettings],] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            role: schema_1.users.role,
            email: schema_1.users.email,
            defaultBranchId: schema_1.users.defaultBranchId,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
            .where((0, drizzle_orm_1.and)(...staffConditions))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName), (0, drizzle_orm_1.asc)(schema_1.users.lastName)),
        db_1.db
            .select({
            id: schema_1.branches.id,
            name: schema_1.branches.name,
            code: schema_1.branches.code,
            isMainBranch: schema_1.branches.isMainBranch,
        })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)(...branchDropdownConditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.isMainBranch), (0, drizzle_orm_1.asc)(schema_1.branches.name)),
        db_1.db
            .select({ id: schema_1.roles.id, name: schema_1.roles.name, slug: schema_1.roles.slug })
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true), (0, drizzle_orm_1.isNull)(schema_1.roles.tenantId))))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.roles.name)),
        // 1. Real POS Orders (Sales, Discounts, Completed, Cancelled)
        db_1.db
            .select({
            staffId: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.orders.cashierId}, ${schema_1.orders.waiterId})`,
            totalSales: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.orders.status} not in ('Cancelled', 'Draft') then ${schema_1.orders.total}::numeric else 0 end), 0)::float`,
            discountTotal: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.orders.status} not in ('Cancelled', 'Draft') then ${schema_1.orders.discountTotal}::numeric else 0 end), 0)::float`,
            completedOrders: (0, drizzle_orm_1.sql) `count(case when ${schema_1.orders.status} not in ('Cancelled', 'Draft') then 1 end)::int`,
            cancelledOrders: (0, drizzle_orm_1.sql) `count(case when ${schema_1.orders.status} = 'Cancelled' then 1 end)::int`,
        })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, startTs), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, endTs), branchFilter(schema_1.orders.branchId), (0, drizzle_orm_1.sql) `COALESCE(${schema_1.orders.cashierId}, ${schema_1.orders.waiterId}) IS NOT NULL`))
            .groupBy((0, drizzle_orm_1.sql) `COALESCE(${schema_1.orders.cashierId}, ${schema_1.orders.waiterId})`),
        // 2. Real Refunds
        db_1.db
            .select({
            staffId: schema_1.refunds.processedById,
            refundCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.refunds)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.refunds.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.refunds.createdAt, startTs), (0, drizzle_orm_1.lte)(schema_1.refunds.createdAt, endTs), branchFilter(schema_1.refunds.branchId), (0, drizzle_orm_1.notInArray)(schema_1.refunds.status, ['CANCELLED']), (0, drizzle_orm_1.sql) `${schema_1.refunds.processedById} IS NOT NULL`))
            .groupBy(schema_1.refunds.processedById),
        // 3. Real Cashier Shift Cash Variances
        db_1.db
            .select({
            cashierId: schema_1.cashierShifts.cashierId,
            closedShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.cashierShifts.status} = 'CLOSED' then 1 end)::int`,
            netCashVariance: (0, drizzle_orm_1.sql) `coalesce(sum(case when ${schema_1.cashierShifts.status} = 'CLOSED' then coalesce(${schema_1.cashierShifts.variance}::numeric, 0) else 0 end), 0)::float`,
        })
            .from(schema_1.cashierShifts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.cashierShifts.openedAt, startTs), (0, drizzle_orm_1.lte)(schema_1.cashierShifts.openedAt, endTs), branchFilter(schema_1.cashierShifts.branchId)))
            .groupBy(schema_1.cashierShifts.cashierId),
        // 4. Real Attendance (Punctuality, Hours, Overtime)
        db_1.db
            .select({
            userId: schema_1.attendanceRecords.userId,
            totalShifts: (0, drizzle_orm_1.sql) `count(*)::int`,
            onTimeShifts: (0, drizzle_orm_1.sql) `count(case when ${schema_1.attendanceRecords.verificationStatus} = 'VERIFIED' then 1 end)::int`,
            totalMinutes: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.attendanceRecords.totalDurationMinutes}), 0)::int`,
            overtimeHours: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.attendanceRecords.overtimeHours}::numeric), 0)::float`,
        })
            .from(schema_1.attendanceRecords)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockInAt, startTs), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockInAt, endTs), branchFilter(schema_1.attendanceRecords.branchId)))
            .groupBy(schema_1.attendanceRecords.userId),
        // 5. Real Guest Feedback / CSAT
        db_1.db
            .select({
            staffId: schema_1.customerFeedback.staffId,
            avgRating: (0, drizzle_orm_1.sql) `coalesce(avg(${schema_1.customerFeedback.rating}), 0)::float`,
            feedbackCount: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.customerFeedback)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerFeedback.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.customerFeedback.createdAt, startTs), (0, drizzle_orm_1.lte)(schema_1.customerFeedback.createdAt, endTs), branchFilter(schema_1.customerFeedback.branchId), (0, drizzle_orm_1.sql) `${schema_1.customerFeedback.staffId} IS NOT NULL`))
            .groupBy(schema_1.customerFeedback.staffId),
        db_1.db
            .select({
            baseCurrency: schema_1.tenantFinancialSettings.baseCurrency,
            tipDistributionModel: schema_1.tenantFinancialSettings.tipDistributionModel,
        })
            .from(schema_1.tenantFinancialSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
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
        const averageTicketValue = completedOrders > 0 ? Number((totalSales / completedOrders).toFixed(2)) : 0;
        const discountRatePct = totalSales + discountTotal > 0
            ? Number(((discountTotal / (totalSales + discountTotal)) * 100).toFixed(1))
            : 0;
        const totalShifts = att?.totalShifts ?? 0;
        const onTimeShifts = att?.onTimeShifts ?? 0;
        const attendanceScore = totalShifts > 0 ? Math.round((onTimeShifts / totalShifts) * 100) : null;
        const hoursWorked = Number(((att?.totalMinutes ?? 0) / 60).toFixed(1));
        const overtimeHours = Number((att?.overtimeHours ?? 0).toFixed(1));
        const salesPerLaborHour = hoursWorked > 0 ? Number((totalSales / hoursWorked).toFixed(2)) : 0;
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
    const branchAggMap = new Map();
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
        if (!t.branchId)
            continue;
        const agg = branchAggMap.get(t.branchId);
        if (!agg)
            continue;
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
        salesPerLaborHour: b.totalHoursWorked > 0 ? Number((b.totalSales / b.totalHoursWorked).toFixed(2)) : 0,
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
exports.getLiveStaffTelemetry = getLiveStaffTelemetry;
const createReviewTransaction = async (tenantId, reviewerId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [employee] = await tx
            .select({
            id: schema_1.users.id,
            defaultBranchId: schema_1.users.defaultBranchId,
            isActive: schema_1.users.isActive,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, input.userId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .limit(1);
        if (!employee || !employee.isActive) {
            throw new Error('Target employee does not exist or is inactive.');
        }
        const [created] = await tx
            .insert(schema_1.staffPerformanceReviews)
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
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: employee.defaultBranchId ?? null,
            userId: actor.userId,
            action: created.status === 'DRAFT' ? 'STAFF_APPRAISAL_DRAFTED' : 'STAFF_APPRAISAL_CREATED',
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
            await tx.insert(schema_1.notifications).values({
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
exports.createReviewTransaction = createReviewTransaction;
const updateReviewTransaction = async (tenantId, reviewId, input, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.staffPerformanceReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status === 'FINALIZED') {
            throw new Error('Immutable Talent Record: Finalized appraisals cannot be altered.');
        }
        const updateSet = {
            updatedAt: new Date(),
        };
        if (input.reviewCycle !== undefined)
            updateSet.reviewCycle = input.reviewCycle;
        if (input.periodStart !== undefined)
            updateSet.periodStart = input.periodStart;
        if (input.periodEnd !== undefined)
            updateSet.periodEnd = input.periodEnd;
        if (input.overallRating !== undefined)
            updateSet.overallRating = input.overallRating.toFixed(2);
        if (input.totalSalesGenerated !== undefined) {
            updateSet.totalSalesGenerated = input.totalSalesGenerated.toFixed(2);
        }
        if (input.salesTarget !== undefined)
            updateSet.salesTarget = input.salesTarget.toFixed(2);
        if (input.averageTicketValue !== undefined) {
            updateSet.averageTicketValue = input.averageTicketValue.toFixed(2);
        }
        if (input.speedOfServiceMinutes !== undefined) {
            updateSet.speedOfServiceMinutes = input.speedOfServiceMinutes.toFixed(1);
        }
        if (input.attendanceScorePercent !== undefined) {
            updateSet.attendanceScorePercent = input.attendanceScorePercent;
        }
        if (input.voidRefundCount !== undefined)
            updateSet.voidRefundCount = input.voidRefundCount;
        if (input.tipPoolAllocated !== undefined) {
            updateSet.tipPoolAllocated = input.tipPoolAllocated.toFixed(2);
        }
        if (input.competencies !== undefined)
            updateSet.competencies = input.competencies;
        if (input.goals !== undefined)
            updateSet.goals = input.goals;
        if (input.managerFeedback !== undefined)
            updateSet.managerFeedback = input.managerFeedback;
        if (input.status !== undefined)
            updateSet.status = input.status;
        const [updated] = await tx
            .update(schema_1.staffPerformanceReviews)
            .set(updateSet)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
            .returning();
        // Notify employee when transitioning from DRAFT → SUBMITTED
        if (existing.status === 'DRAFT' && updated.status === 'SUBMITTED') {
            await tx.insert(schema_1.notifications).values({
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
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: null,
            userId: actor.userId,
            action: input.status === 'FINALIZED' ? 'STAFF_APPRAISAL_FINALIZED' : 'STAFF_APPRAISAL_UPDATED',
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
exports.updateReviewTransaction = updateReviewTransaction;
const deleteDraftReviewTransaction = async (tenantId, reviewId, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.staffPerformanceReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.status !== 'DRAFT') {
            throw new Error('Governance policy: Only DRAFT appraisals can be deleted. Submitted or finalized records are immutable.');
        }
        await tx
            .delete(schema_1.staffPerformanceReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)));
        await tx.insert(schema_1.auditLogs).values({
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
exports.deleteDraftReviewTransaction = deleteDraftReviewTransaction;
const acknowledgeReviewTransaction = async (tenantId, reviewId, userId, employeeFeedback, actor) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.staffPerformanceReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
            .limit(1);
        if (!existing)
            return null;
        if (existing.userId !== userId) {
            throw new Error('Permission denied: Only the employee receiving this appraisal may submit acknowledgment.');
        }
        if (existing.status === 'FINALIZED') {
            throw new Error('This appraisal has already been finalized.');
        }
        const [acknowledged] = await tx
            .update(schema_1.staffPerformanceReviews)
            .set({
            status: 'ACKNOWLEDGED',
            employeeFeedback: employeeFeedback ?? existing.employeeFeedback,
            acknowledgedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.id, reviewId), (0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId)))
            .returning();
        await tx
            .update(schema_1.notifications)
            .set({
            isRead: true,
            isResolved: true,
            resolvedAt: new Date(),
            resolvedByUserId: userId,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.notifications.entityType, 'staff_performance_reviews'), (0, drizzle_orm_1.eq)(schema_1.notifications.entityId, String(reviewId)), (0, drizzle_orm_1.eq)(schema_1.notifications.isResolved, false)));
        await tx.insert(schema_1.auditLogs).values({
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
exports.acknowledgeReviewTransaction = acknowledgeReviewTransaction;
