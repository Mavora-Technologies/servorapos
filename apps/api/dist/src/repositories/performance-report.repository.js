"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExportablePerformanceReport = exports.getPerformanceReportMetrics = void 0;
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
const getPerformanceReportMetrics = async (tenantId, query) => {
    const { start, end } = parseDateRange(query.startDate, query.endDate);
    // 1. Base Staff Query
    const staffConditions = [
        (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.users.isActive, true),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, query.branchId) : undefined,
        query.role && query.role !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.users.role, query.role) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.users.firstName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.lastName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.email, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const staffList = await db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        email: schema_1.users.email,
        role: schema_1.users.role,
        branchId: schema_1.users.defaultBranchId,
        branchName: schema_1.branches.name,
        createdAt: schema_1.users.createdAt,
    })
        .from(schema_1.users)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...staffConditions));
    if (staffList.length === 0) {
        return {
            summary: {
                totalStaffCount: 0,
                totalSalesGenerated: 0,
                totalHoursLogged: 0,
                laborRevenuePerHour: 0,
                avgAttendanceScore: 100,
                avgAppraisalRating: 0,
                topRevenueProducer: 'None',
            },
            items: [],
            departmentBenchmarks: [],
            pagination: { page: 1, limit: query.limit || 25, total: 0, totalPages: 1 },
        };
    }
    const staffIds = staffList.map((s) => s.id);
    // 2. Aggregate Sales Produced per Employee in the Period (Both Cashier & Waiter roles)
    const salesAggregates = await db_1.db
        .select({
        staffId: (0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.cashierId}, ${schema_1.orders.waiterId})`,
        orderCount: (0, drizzle_orm_1.sql) `count(*)`,
        completedOrders: (0, drizzle_orm_1.sql) `count(case when lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft') then 1 end)`,
        voidCount: (0, drizzle_orm_1.sql) `count(case when lower(${schema_1.orders.status}) in ('cancelled', 'voided') then 1 end)`,
        grossSales: (0, drizzle_orm_1.sql) `coalesce(sum(case when lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft') then ${schema_1.orders.total} else 0 end), 0)::numeric`,
        avgTicket: (0, drizzle_orm_1.sql) `coalesce(avg(case when lower(${schema_1.orders.status}) not in ('cancelled', 'voided', 'draft') then ${schema_1.orders.total} else null end), 0)::numeric`,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, start), (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, end), (0, drizzle_orm_1.sql) `(${schema_1.orders.cashierId} in ${staffIds} or ${schema_1.orders.waiterId} in ${staffIds})`, query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined))
        .groupBy((0, drizzle_orm_1.sql) `coalesce(${schema_1.orders.cashierId}, ${schema_1.orders.waiterId})`);
    const salesMap = new Map(salesAggregates.map((s) => [
        Number(s.staffId),
        {
            orderCount: Number(s.orderCount),
            completedOrders: Number(s.completedOrders),
            voidCount: Number(s.voidCount),
            grossSales: Number(s.grossSales),
            avgTicket: Number(s.avgTicket),
        },
    ]));
    // 3. Aggregate Actual Worked Attendance & Overtime Hours
    const attendanceAggregates = await db_1.db
        .select({
        userId: schema_1.attendanceRecords.userId,
        totalHours: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.attendanceRecords.regularHours} + ${schema_1.attendanceRecords.overtimeHours}), 0)::numeric`,
        regularHours: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.attendanceRecords.regularHours}), 0)::numeric`,
        overtimeHours: (0, drizzle_orm_1.sql) `coalesce(sum(${schema_1.attendanceRecords.overtimeHours}), 0)::numeric`,
        shiftsLogged: (0, drizzle_orm_1.sql) `count(*)`,
        punctualCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.attendanceRecords.verificationStatus} = 'VERIFIED' then 1 end)`,
    })
        .from(schema_1.attendanceRecords)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.attendanceRecords.tenantId, tenantId), (0, drizzle_orm_1.gte)(schema_1.attendanceRecords.clockInAt, start), (0, drizzle_orm_1.lte)(schema_1.attendanceRecords.clockInAt, end), (0, drizzle_orm_1.sql) `${schema_1.attendanceRecords.userId} in ${staffIds}`))
        .groupBy(schema_1.attendanceRecords.userId);
    const attendanceMap = new Map(attendanceAggregates.map((a) => {
        const shifts = Number(a.shiftsLogged);
        const punctual = Number(a.punctualCount);
        const attendanceScore = shifts > 0 ? Math.round((punctual / shifts) * 100) : 100;
        return [
            Number(a.userId),
            {
                totalHours: Math.round(Number(a.totalHours) * 10) / 10,
                regularHours: Number(a.regularHours),
                overtimeHours: Number(a.overtimeHours),
                shiftsLogged: shifts,
                attendanceScore,
            },
        ];
    }));
    // 4. Fetch Latest Performance Review Rating
    const performanceReviews = await db_1.db
        .select({
        userId: schema_1.staffPerformanceReviews.userId,
        overallRating: schema_1.staffPerformanceReviews.overallRating,
        salesTarget: schema_1.staffPerformanceReviews.salesTarget,
        speedOfServiceMinutes: schema_1.staffPerformanceReviews.speedOfServiceMinutes,
        status: schema_1.staffPerformanceReviews.status,
    })
        .from(schema_1.staffPerformanceReviews)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.staffPerformanceReviews.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.staffPerformanceReviews.userId} in ${staffIds}`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.staffPerformanceReviews.periodEnd));
    const reviewMap = new Map();
    performanceReviews.forEach((rev) => {
        if (!reviewMap.has(rev.userId)) {
            reviewMap.set(rev.userId, {
                rating: Number(rev.overallRating) || 4.0,
                target: Number(rev.salesTarget) || 0,
                speedOfService: Number(rev.speedOfServiceMinutes) || 0,
            });
        }
    });
    // 5. Combine and Calculate Productivity & Efficiency Ratios
    let portfolioSalesSum = 0;
    let portfolioHoursSum = 0;
    let attendanceScoreSum = 0;
    let ratingScoreSum = 0;
    const enrichedStaff = staffList.map((member) => {
        const sData = salesMap.get(member.id) || {
            orderCount: 0,
            completedOrders: 0,
            voidCount: 0,
            grossSales: 0,
            avgTicket: 0,
        };
        const aData = attendanceMap.get(member.id) || {
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            shiftsLogged: 0,
            attendanceScore: 100,
        };
        const rData = reviewMap.get(member.id) || {
            rating: 4.0,
            target: 0,
            speedOfService: 12.0,
        };
        const salesPerHour = aData.totalHours > 0 ? Math.round((sData.grossSales / aData.totalHours) * 100) / 100 : 0;
        const targetAttainmentPercent = rData.target > 0 ? Math.round((sData.grossSales / rData.target) * 100) : 100;
        portfolioSalesSum += sData.grossSales;
        portfolioHoursSum += aData.totalHours;
        attendanceScoreSum += aData.attendanceScore;
        ratingScoreSum += rData.rating;
        // Categorization into enterprise talent tiers
        let performanceTier = 'MEETING_TARGET';
        if (rData.rating >= 4.3 || targetAttainmentPercent >= 110) {
            performanceTier = 'TOP_TIER';
        }
        else if (rData.rating < 3.2 || (rData.target > 0 && targetAttainmentPercent < 80)) {
            performanceTier = 'UNDERPERFORMING';
        }
        return {
            userId: member.id,
            name: member.fullName,
            email: member.email,
            role: member.role,
            branchName: member.branchName || 'Primary Station',
            grossSales: sData.grossSales,
            completedOrders: sData.completedOrders,
            voidCount: sData.voidCount,
            avgTicket: sData.avgTicket,
            totalHours: aData.totalHours,
            overtimeHours: aData.overtimeHours,
            shiftsLogged: aData.shiftsLogged,
            attendanceScore: aData.attendanceScore,
            rating: rData.rating,
            salesTarget: rData.target,
            salesPerHour,
            targetAttainmentPercent,
            performanceTier,
        };
    });
    // Filter by Tier if selected
    const filteredStaff = enrichedStaff.filter((s) => {
        if (query.performanceTier === 'ALL')
            return true;
        return s.performanceTier === query.performanceTier;
    });
    // Sorter logic
    filteredStaff.sort((a, b) => {
        let diff = 0;
        if (query.sortBy === 'SALES')
            diff = b.grossSales - a.grossSales;
        else if (query.sortBy === 'TICKETS')
            diff = b.completedOrders - a.completedOrders;
        else if (query.sortBy === 'HOURS_WORKED')
            diff = b.totalHours - a.totalHours;
        else if (query.sortBy === 'RATING')
            diff = b.rating - a.rating;
        else if (query.sortBy === 'VOIDS')
            diff = b.voidCount - a.voidCount;
        else if (query.sortBy === 'NAME')
            return a.name.localeCompare(b.name);
        return query.sortOrder === 'ASC' ? -diff : diff;
    });
    const page = query.page || 1;
    const limit = query.limit || 25;
    const paginatedItems = filteredStaff.slice((page - 1) * limit, page * limit);
    // Department Benchmarks (Role group breakdown)
    const roleGroupMap = new Map();
    enrichedStaff.forEach((s) => {
        const existing = roleGroupMap.get(s.role) || {
            role: s.role,
            count: 0,
            totalSales: 0,
            totalHours: 0,
            avgRating: 0,
        };
        existing.count += 1;
        existing.totalSales += s.grossSales;
        existing.totalHours += s.totalHours;
        existing.avgRating += s.rating;
        roleGroupMap.set(s.role, existing);
    });
    const departmentBenchmarks = Array.from(roleGroupMap.values()).map((r) => ({
        role: r.role,
        headcount: r.count,
        totalSales: r.totalSales,
        avgSalesPerEmployee: r.count > 0 ? Math.round(r.totalSales / r.count) : 0,
        laborEfficiency: r.totalHours > 0 ? Math.round(r.totalSales / r.totalHours) : 0,
        avgRating: r.count > 0 ? Math.round((r.avgRating / r.count) * 10) / 10 : 4.0,
    })).sort((a, b) => b.totalSales - a.totalSales);
    const topPerformer = enrichedStaff.reduce((max, s) => (s.grossSales > (max?.grossSales || 0) ? s : max), enrichedStaff[0]);
    return {
        summary: {
            totalStaffCount: enrichedStaff.length,
            totalSalesGenerated: Math.round(portfolioSalesSum * 100) / 100,
            totalHoursLogged: Math.round(portfolioHoursSum * 10) / 10,
            laborRevenuePerHour: portfolioHoursSum > 0 ? Math.round((portfolioSalesSum / portfolioHoursSum) * 100) / 100 : 0,
            avgAttendanceScore: enrichedStaff.length > 0 ? Math.round(attendanceScoreSum / enrichedStaff.length) : 100,
            avgAppraisalRating: enrichedStaff.length > 0 ? Math.round((ratingScoreSum / enrichedStaff.length) * 10) / 10 : 4.0,
            topRevenueProducer: topPerformer?.name || 'N/A',
        },
        items: paginatedItems,
        departmentBenchmarks,
        pagination: {
            page,
            limit,
            total: filteredStaff.length,
            totalPages: Math.ceil(filteredStaff.length / limit) || 1,
        },
    };
};
exports.getPerformanceReportMetrics = getPerformanceReportMetrics;
const getExportablePerformanceReport = async (tenantId, query) => {
    return await (0, exports.getPerformanceReportMetrics)(tenantId, { ...query, limit: 1000, page: 1 });
};
exports.getExportablePerformanceReport = getExportablePerformanceReport;
