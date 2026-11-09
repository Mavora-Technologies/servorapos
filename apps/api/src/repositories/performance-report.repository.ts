import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  users,
  orders,
  attendanceRecords,
  staffPerformanceReviews,
  branches,
} from '../config/schema';
import { PerformanceReportQuery } from '../validators/performance-report.validator';

const parseDateRange = (startDateStr?: string, endDateStr?: string) => {
  let start: Date;
  if (startDateStr) {
    start = new Date(startDateStr);
    if (!startDateStr.includes('T')) {
      start.setHours(0, 0, 0, 0);
    }
  } else {
    start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
  }

  let end: Date;
  if (endDateStr) {
    end = new Date(endDateStr);
    if (!endDateStr.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else {
    end = new Date();
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getPerformanceReportMetrics = async (tenantId: number, query: PerformanceReportQuery) => {
  const { start, end } = parseDateRange(query.startDate, query.endDate);

  // 1. Base Staff Query
  const staffConditions = [
    eq(users.tenantId, tenantId),
    eq(users.isActive, true),
    query.branchId ? eq(users.defaultBranchId, query.branchId) : undefined,
    query.role && query.role !== 'ALL' ? eq(users.role, query.role) : undefined,
    query.search
      ? or(
          ilike(users.firstName, `%${query.search}%`),
          ilike(users.lastName, `%${query.search}%`),
          ilike(users.email, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const staffList = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      email: users.email,
      role: users.role,
      branchId: users.defaultBranchId,
      branchName: branches.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(branches, eq(users.defaultBranchId, branches.id))
    .where(and(...staffConditions));

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
  const salesAggregates = await db
    .select({
      staffId: sql<number>`coalesce(${orders.cashierId}, ${orders.waiterId})`,
      orderCount: sql<number>`count(*)`,
      completedOrders: sql<number>`count(case when lower(${orders.status}) not in ('cancelled', 'voided', 'draft') then 1 end)`,
      voidCount: sql<number>`count(case when lower(${orders.status}) in ('cancelled', 'voided') then 1 end)`,
      grossSales: sql<number>`coalesce(sum(case when lower(${orders.status}) not in ('cancelled', 'voided', 'draft') then ${orders.total} else 0 end), 0)::numeric`,
      avgTicket: sql<number>`coalesce(avg(case when lower(${orders.status}) not in ('cancelled', 'voided', 'draft') then ${orders.total} else null end), 0)::numeric`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end),
        sql`(${orders.cashierId} in ${staffIds} or ${orders.waiterId} in ${staffIds})`,
        query.branchId ? eq(orders.branchId, query.branchId) : undefined
      )
    )
    .groupBy(sql`coalesce(${orders.cashierId}, ${orders.waiterId})`);

  const salesMap = new Map(
    salesAggregates.map((s) => [
      Number(s.staffId),
      {
        orderCount: Number(s.orderCount),
        completedOrders: Number(s.completedOrders),
        voidCount: Number(s.voidCount),
        grossSales: Number(s.grossSales),
        avgTicket: Number(s.avgTicket),
      },
    ])
  );

  // 3. Aggregate Actual Worked Attendance & Overtime Hours
  const attendanceAggregates = await db
    .select({
      userId: attendanceRecords.userId,
      totalHours: sql<number>`coalesce(sum(${attendanceRecords.regularHours} + ${attendanceRecords.overtimeHours}), 0)::numeric`,
      regularHours: sql<number>`coalesce(sum(${attendanceRecords.regularHours}), 0)::numeric`,
      overtimeHours: sql<number>`coalesce(sum(${attendanceRecords.overtimeHours}), 0)::numeric`,
      shiftsLogged: sql<number>`count(*)`,
      punctualCount: sql<number>`count(case when ${attendanceRecords.verificationStatus} = 'VERIFIED' then 1 end)`,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.tenantId, tenantId),
        gte(attendanceRecords.clockInAt, start),
        lte(attendanceRecords.clockInAt, end),
        sql`${attendanceRecords.userId} in ${staffIds}`
      )
    )
    .groupBy(attendanceRecords.userId);

  const attendanceMap = new Map(
    attendanceAggregates.map((a) => {
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
    })
  );

  // 4. Fetch Latest Performance Review Rating
  const performanceReviews = await db
    .select({
      userId: staffPerformanceReviews.userId,
      overallRating: staffPerformanceReviews.overallRating,
      salesTarget: staffPerformanceReviews.salesTarget,
      speedOfServiceMinutes: staffPerformanceReviews.speedOfServiceMinutes,
      status: staffPerformanceReviews.status,
    })
    .from(staffPerformanceReviews)
    .where(
      and(
        eq(staffPerformanceReviews.tenantId, tenantId),
        sql`${staffPerformanceReviews.userId} in ${staffIds}`
      )
    )
    .orderBy(desc(staffPerformanceReviews.periodEnd));

  const reviewMap = new Map<number, { rating: number; target: number; speedOfService: number }>();
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
    let performanceTier: 'TOP_TIER' | 'MEETING_TARGET' | 'UNDERPERFORMING' = 'MEETING_TARGET';
    if (rData.rating >= 4.3 || targetAttainmentPercent >= 110) {
      performanceTier = 'TOP_TIER';
    } else if (rData.rating < 3.2 || (rData.target > 0 && targetAttainmentPercent < 80)) {
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
    if (query.performanceTier === 'ALL') return true;
    return s.performanceTier === query.performanceTier;
  });

  // Sorter logic
  filteredStaff.sort((a, b) => {
    let diff = 0;
    if (query.sortBy === 'SALES') diff = b.grossSales - a.grossSales;
    else if (query.sortBy === 'TICKETS') diff = b.completedOrders - a.completedOrders;
    else if (query.sortBy === 'HOURS_WORKED') diff = b.totalHours - a.totalHours;
    else if (query.sortBy === 'RATING') diff = b.rating - a.rating;
    else if (query.sortBy === 'VOIDS') diff = b.voidCount - a.voidCount;
    else if (query.sortBy === 'NAME') return a.name.localeCompare(b.name);
    return query.sortOrder === 'ASC' ? -diff : diff;
  });

  const page = query.page || 1;
  const limit = query.limit || 25;
  const paginatedItems = filteredStaff.slice((page - 1) * limit, page * limit);

  // Department Benchmarks (Role group breakdown)
  const roleGroupMap = new Map<string, { role: string; count: number; totalSales: number; totalHours: number; avgRating: number }>();
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

export const getExportablePerformanceReport = async (tenantId: number, query: PerformanceReportQuery) => {
  return await getPerformanceReportMetrics(tenantId, { ...query, limit: 1000, page: 1 });
};