"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSavedReport = exports.updateSavedReport = exports.getSavedReportDetail = exports.listTenantSavedReports = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listTenantSavedReports = async (tenantId, query) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.tenantId, tenantId),
        (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.isSystem, false),
        query.category !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.category, query.category) : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.reportDefinitions.name, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.reportDefinitions.code, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.reportDefinitions.description, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    // Subquery: execution count and latest run timestamp
    const executionsSubquery = db_1.db
        .select({
        definitionId: schema_1.reportExecutions.reportDefinitionId,
        executionCount: (0, drizzle_orm_1.sql) `count(*)`.as('execution_count'),
        lastRunAt: (0, drizzle_orm_1.sql) `max(${schema_1.reportExecutions.generatedAt})`.as('last_run_at'),
        lastStatus: (0, drizzle_orm_1.sql) `(array_agg(${schema_1.reportExecutions.status} order by ${schema_1.reportExecutions.generatedAt} desc))[1]`.as('last_status'),
    })
        .from(schema_1.reportExecutions)
        .where((0, drizzle_orm_1.eq)(schema_1.reportExecutions.tenantId, tenantId))
        .groupBy(schema_1.reportExecutions.reportDefinitionId)
        .as('exec_stats');
    // Subquery: active recurring schedules count
    const schedulesSubquery = db_1.db
        .select({
        definitionId: schema_1.reportSchedules.reportDefinitionId,
        scheduleCount: (0, drizzle_orm_1.sql) `count(*)`.as('schedule_count'),
        activeScheduleCount: (0, drizzle_orm_1.sql) `count(case when ${schema_1.reportSchedules.isActive} = true then 1 end)`.as('active_schedule_count'),
    })
        .from(schema_1.reportSchedules)
        .where((0, drizzle_orm_1.eq)(schema_1.reportSchedules.tenantId, tenantId))
        .groupBy(schema_1.reportSchedules.reportDefinitionId)
        .as('sched_stats');
    const baseQuery = db_1.db
        .select({
        id: schema_1.reportDefinitions.id,
        code: schema_1.reportDefinitions.code,
        name: schema_1.reportDefinitions.name,
        category: schema_1.reportDefinitions.category,
        description: schema_1.reportDefinitions.description,
        supportedFormats: schema_1.reportDefinitions.supportedFormats,
        parameterSchema: schema_1.reportDefinitions.parameterSchema,
        isActive: schema_1.reportDefinitions.isActive,
        createdAt: schema_1.reportDefinitions.createdAt,
        updatedAt: schema_1.reportDefinitions.updatedAt,
        executionCount: (0, drizzle_orm_1.sql) `coalesce(${executionsSubquery.executionCount}, 0)`,
        lastRunAt: executionsSubquery.lastRunAt,
        lastStatus: executionsSubquery.lastStatus,
        scheduleCount: (0, drizzle_orm_1.sql) `coalesce(${schedulesSubquery.scheduleCount}, 0)`,
        activeScheduleCount: (0, drizzle_orm_1.sql) `coalesce(${schedulesSubquery.activeScheduleCount}, 0)`,
    })
        .from(schema_1.reportDefinitions)
        .leftJoin(executionsSubquery, (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.id, executionsSubquery.definitionId))
        .leftJoin(schedulesSubquery, (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.id, schedulesSubquery.definitionId))
        .where((0, drizzle_orm_1.and)(...conditions));
    let orderClause = (0, drizzle_orm_1.desc)(schema_1.reportDefinitions.createdAt);
    if (query.sortBy === 'NAME') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(schema_1.reportDefinitions.name) : (0, drizzle_orm_1.desc)(schema_1.reportDefinitions.name);
    }
    else if (query.sortBy === 'EXECUTION_COUNT') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)((0, drizzle_orm_1.sql) `coalesce(${executionsSubquery.executionCount}, 0)`) : (0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `coalesce(${executionsSubquery.executionCount}, 0)`);
    }
    else if (query.sortBy === 'LAST_RUN') {
        orderClause = query.sortOrder === 'ASC' ? (0, drizzle_orm_1.asc)(executionsSubquery.lastRunAt) : (0, drizzle_orm_1.desc)(executionsSubquery.lastRunAt);
    }
    const reports = await baseQuery.orderBy(orderClause);
    // In-memory filter for schedule status if requested
    const filtered = reports.filter((r) => {
        if (query.isScheduled === 'YES')
            return Number(r.activeScheduleCount) > 0;
        if (query.isScheduled === 'NO')
            return Number(r.activeScheduleCount) === 0;
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
exports.listTenantSavedReports = listTenantSavedReports;
const getSavedReportDetail = async (tenantId, reportId) => {
    const [report] = await db_1.db
        .select()
        .from(schema_1.reportDefinitions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reportDefinitions.id, reportId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.isSystem, false)))
        .limit(1);
    return report || null;
};
exports.getSavedReportDetail = getSavedReportDetail;
const updateSavedReport = async (tenantId, reportId, data) => {
    const [updated] = await db_1.db
        .update(schema_1.reportDefinitions)
        .set({
        ...data,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reportDefinitions.id, reportId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.isSystem, false)))
        .returning();
    return updated || null;
};
exports.updateSavedReport = updateSavedReport;
const deleteSavedReport = async (tenantId, reportId) => {
    const [deleted] = await db_1.db
        .delete(schema_1.reportDefinitions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reportDefinitions.id, reportId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.reportDefinitions.isSystem, false)))
        .returning();
    return deleted || null;
};
exports.deleteSavedReport = deleteSavedReport;
