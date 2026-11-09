import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  reportDefinitions,
  reportExecutions,
  reportSchedules,
  users,
} from '../config/schema';
import { ListSavedReportsQuery, UpdateSavedReportInput } from '../validators/saved-reports.validator';

export const listTenantSavedReports = async (tenantId: number, query: ListSavedReportsQuery) => {
  const conditions = [
    eq(reportDefinitions.tenantId, tenantId),
    eq(reportDefinitions.isSystem, false),
    query.category !== 'ALL' ? eq(reportDefinitions.category, query.category) : undefined,
    query.search
      ? or(
          ilike(reportDefinitions.name, `%${query.search}%`),
          ilike(reportDefinitions.code, `%${query.search}%`),
          ilike(reportDefinitions.description, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  // Subquery: execution count and latest run timestamp
  const executionsSubquery = db
    .select({
      definitionId: reportExecutions.reportDefinitionId,
      executionCount: sql<number>`count(*)`.as('execution_count'),
      lastRunAt: sql<string | null>`max(${reportExecutions.generatedAt})`.as('last_run_at'),
      lastStatus: sql<string | null>`(array_agg(${reportExecutions.status} order by ${reportExecutions.generatedAt} desc))[1]`.as('last_status'),
    })
    .from(reportExecutions)
    .where(eq(reportExecutions.tenantId, tenantId))
    .groupBy(reportExecutions.reportDefinitionId)
    .as('exec_stats');

  // Subquery: active recurring schedules count
  const schedulesSubquery = db
    .select({
      definitionId: reportSchedules.reportDefinitionId,
      scheduleCount: sql<number>`count(*)`.as('schedule_count'),
      activeScheduleCount: sql<number>`count(case when ${reportSchedules.isActive} = true then 1 end)`.as('active_schedule_count'),
    })
    .from(reportSchedules)
    .where(eq(reportSchedules.tenantId, tenantId))
    .groupBy(reportSchedules.reportDefinitionId)
    .as('sched_stats');

  const baseQuery = db
    .select({
      id: reportDefinitions.id,
      code: reportDefinitions.code,
      name: reportDefinitions.name,
      category: reportDefinitions.category,
      description: reportDefinitions.description,
      supportedFormats: reportDefinitions.supportedFormats,
      parameterSchema: reportDefinitions.parameterSchema,
      isActive: reportDefinitions.isActive,
      createdAt: reportDefinitions.createdAt,
      updatedAt: reportDefinitions.updatedAt,
      executionCount: sql<number>`coalesce(${executionsSubquery.executionCount}, 0)`,
      lastRunAt: executionsSubquery.lastRunAt,
      lastStatus: executionsSubquery.lastStatus,
      scheduleCount: sql<number>`coalesce(${schedulesSubquery.scheduleCount}, 0)`,
      activeScheduleCount: sql<number>`coalesce(${schedulesSubquery.activeScheduleCount}, 0)`,
    })
    .from(reportDefinitions)
    .leftJoin(executionsSubquery, eq(reportDefinitions.id, executionsSubquery.definitionId))
    .leftJoin(schedulesSubquery, eq(reportDefinitions.id, schedulesSubquery.definitionId))
    .where(and(...conditions));

  let orderClause = desc(reportDefinitions.createdAt);
  if (query.sortBy === 'NAME') {
    orderClause = query.sortOrder === 'ASC' ? asc(reportDefinitions.name) : desc(reportDefinitions.name);
  } else if (query.sortBy === 'EXECUTION_COUNT') {
    orderClause = query.sortOrder === 'ASC' ? asc(sql`coalesce(${executionsSubquery.executionCount}, 0)`) : desc(sql`coalesce(${executionsSubquery.executionCount}, 0)`);
  } else if (query.sortBy === 'LAST_RUN') {
    orderClause = query.sortOrder === 'ASC' ? asc(executionsSubquery.lastRunAt) : desc(executionsSubquery.lastRunAt);
  }

  const reports = await baseQuery.orderBy(orderClause);

  // In-memory filter for schedule status if requested
  const filtered = reports.filter((r) => {
    if (query.isScheduled === 'YES') return Number(r.activeScheduleCount) > 0;
    if (query.isScheduled === 'NO') return Number(r.activeScheduleCount) === 0;
    return true;
  });

  const page = query.page || 1;
  const limit = query.limit || 25;
  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return {
    reports: paginated.map((r) => ({
      ...r,
      executionCount: Number(r.executionCount),
      scheduleCount: Number(r.scheduleCount),
      activeScheduleCount: Number(r.activeScheduleCount),
      isScheduled: Number(r.activeScheduleCount) > 0,
    })),
    summary: {
      totalSavedReports: total,
      activeReports: reports.filter((r) => r.isActive).length,
      scheduledReports: reports.filter((r) => Number(r.activeScheduleCount) > 0).length,
      totalExecutions: reports.reduce((acc, r) => acc + Number(r.executionCount), 0),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getSavedReportDetail = async (tenantId: number, reportId: number) => {
  const [report] = await db
    .select()
    .from(reportDefinitions)
    .where(
      and(
        eq(reportDefinitions.id, reportId),
        eq(reportDefinitions.tenantId, tenantId),
        eq(reportDefinitions.isSystem, false)
      )
    )
    .limit(1);

  return report || null;
};

export const updateSavedReport = async (
  tenantId: number,
  reportId: number,
  data: UpdateSavedReportInput
) => {
  const [updated] = await db
    .update(reportDefinitions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(reportDefinitions.id, reportId),
        eq(reportDefinitions.tenantId, tenantId),
        eq(reportDefinitions.isSystem, false)
      )
    )
    .returning();

  return updated || null;
};

export const deleteSavedReport = async (tenantId: number, reportId: number) => {
  const [deleted] = await db
    .delete(reportDefinitions)
    .where(
      and(
        eq(reportDefinitions.id, reportId),
        eq(reportDefinitions.tenantId, tenantId),
        eq(reportDefinitions.isSystem, false)
      )
    )
    .returning();

  return deleted || null;
};