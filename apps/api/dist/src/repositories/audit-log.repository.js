"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAuditLog = exports.getDynamicFilterOptions = exports.getAuditLogTelemetry = exports.getAuditLogById = exports.listAuditLogs = void 0;
// apps/api/src/repositories/audit-log.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
function parseStartDate(raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(`${raw}T00:00:00.000Z`);
    }
    return new Date(raw);
}
function parseEndDate(raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(`${raw}T23:59:59.999Z`);
    }
    return new Date(raw);
}
const listAuditLogs = async (tenantId, query) => {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const offset = (page - 1) * limit;
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId)];
    if (query.module && query.module !== 'ALL') {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.module, query.module));
    }
    if (query.action && query.action !== 'ALL') {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.action, query.action));
    }
    if (query.userId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, query.userId));
    }
    if (query.branchId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.branchId, query.branchId));
    }
    if (query.entityType && query.entityType !== 'ALL') {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.entityType, query.entityType));
    }
    if (query.entityId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.auditLogs.entityId, query.entityId));
    }
    if (query.startDate) {
        conditions.push((0, drizzle_orm_1.gte)(schema_1.auditLogs.createdAt, parseStartDate(query.startDate)));
    }
    if (query.endDate) {
        conditions.push((0, drizzle_orm_1.lte)(schema_1.auditLogs.createdAt, parseEndDate(query.endDate)));
    }
    if (query.search) {
        const pattern = `%${query.search}%`;
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.auditLogs.action, pattern), (0, drizzle_orm_1.ilike)(schema_1.auditLogs.module, pattern), (0, drizzle_orm_1.ilike)(schema_1.auditLogs.entityType, pattern), (0, drizzle_orm_1.ilike)(schema_1.auditLogs.entityId, pattern), (0, drizzle_orm_1.ilike)(schema_1.auditLogs.reason, pattern), (0, drizzle_orm_1.ilike)(schema_1.auditLogs.ipAddress, pattern), (0, drizzle_orm_1.ilike)(schema_1.users.firstName, pattern), (0, drizzle_orm_1.ilike)(schema_1.users.lastName, pattern), (0, drizzle_orm_1.ilike)(schema_1.users.email, pattern)));
    }
    const [countResult, records] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.auditLogs)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.auditLogs.id,
            tenantId: schema_1.auditLogs.tenantId,
            branchId: schema_1.auditLogs.branchId,
            branchName: schema_1.branches.name,
            branchCode: schema_1.branches.code,
            userId: schema_1.auditLogs.userId,
            actorName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), '')`,
            actorEmail: schema_1.users.email,
            actorRole: schema_1.users.role,
            action: schema_1.auditLogs.action,
            module: schema_1.auditLogs.module,
            entityType: schema_1.auditLogs.entityType,
            entityId: schema_1.auditLogs.entityId,
            reason: schema_1.auditLogs.reason,
            previousValues: schema_1.auditLogs.previousValues,
            newValues: schema_1.auditLogs.newValues,
            ipAddress: schema_1.auditLogs.ipAddress,
            createdAt: schema_1.auditLogs.createdAt,
        })
            .from(schema_1.auditLogs)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.createdAt), (0, drizzle_orm_1.desc)(schema_1.auditLogs.id))
            .limit(limit)
            .offset(offset),
    ]);
    const total = Number(countResult[0]?.count ?? 0);
    return {
        records,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    };
};
exports.listAuditLogs = listAuditLogs;
const getAuditLogById = async (tenantId, id) => {
    const [record] = await db_1.db
        .select({
        id: schema_1.auditLogs.id,
        tenantId: schema_1.auditLogs.tenantId,
        branchId: schema_1.auditLogs.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        userId: schema_1.auditLogs.userId,
        actorName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), '')`,
        actorEmail: schema_1.users.email,
        actorRole: schema_1.users.role,
        action: schema_1.auditLogs.action,
        module: schema_1.auditLogs.module,
        entityType: schema_1.auditLogs.entityType,
        entityId: schema_1.auditLogs.entityId,
        reason: schema_1.auditLogs.reason,
        previousValues: schema_1.auditLogs.previousValues,
        newValues: schema_1.auditLogs.newValues,
        ipAddress: schema_1.auditLogs.ipAddress,
        createdAt: schema_1.auditLogs.createdAt,
    })
        .from(schema_1.auditLogs)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.branchId, schema_1.branches.id), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.id, id), (0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId)))
        .limit(1);
    return record ?? null;
};
exports.getAuditLogById = getAuditLogById;
const getAuditLogTelemetry = async (tenantId) => {
    const [totalsResult, modulesResult, actorsResult] = await Promise.all([
        db_1.db
            .select({
            totalEvents: (0, drizzle_orm_1.sql) `count(*)::int`,
            last24Hours: (0, drizzle_orm_1.sql) `count(case when ${schema_1.auditLogs.createdAt} >= now() - interval '24 hours' then 1 end)::int`,
        })
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId)),
        db_1.db
            .select({
            module: schema_1.auditLogs.module,
            count: (0, drizzle_orm_1.sql) `count(*)::int`,
        })
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId))
            .groupBy(schema_1.auditLogs.module)
            .orderBy((0, drizzle_orm_1.desc)((0, drizzle_orm_1.sql) `count(*)`)),
        db_1.db
            .select({
            distinctUsers: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.auditLogs.userId})::int`,
        })
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId), (0, drizzle_orm_1.sql) `${schema_1.auditLogs.userId} is not null`)),
    ]);
    return {
        totalEvents: Number(totalsResult[0]?.totalEvents ?? 0),
        eventsLast24Hours: Number(totalsResult[0]?.last24Hours ?? 0),
        activeActors: Number(actorsResult[0]?.distinctUsers ?? 0),
        moduleBreakdown: modulesResult.map((m) => ({
            module: m.module,
            count: Number(m.count),
        })),
    };
};
exports.getAuditLogTelemetry = getAuditLogTelemetry;
const getDynamicFilterOptions = async (tenantId) => {
    const [modules, actions, entityTypes, actors] = await Promise.all([
        db_1.db
            .selectDistinct({ module: schema_1.auditLogs.module })
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.auditLogs.module)),
        db_1.db
            .selectDistinct({ action: schema_1.auditLogs.action })
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.auditLogs.action)),
        db_1.db
            .selectDistinct({ entityType: schema_1.auditLogs.entityType })
            .from(schema_1.auditLogs)
            .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.auditLogs.entityType)),
        db_1.db
            .selectDistinct({
            id: schema_1.users.id,
            name: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            email: schema_1.users.email,
        })
            .from(schema_1.auditLogs)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
            .where((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName)),
    ]);
    return {
        modules: modules.map((m) => m.module),
        actions: actions.map((a) => a.action),
        entityTypes: entityTypes.map((e) => e.entityType),
        actors,
    };
};
exports.getDynamicFilterOptions = getDynamicFilterOptions;
const recordAuditLog = async (tenantId, input) => {
    const [created] = await db_1.db
        .insert(schema_1.auditLogs)
        .values({
        tenantId,
        branchId: input.branchId ?? null,
        userId: input.userId ?? null,
        action: input.action.slice(0, 100),
        module: input.module.slice(0, 50),
        entityType: input.entityType.slice(0, 100),
        entityId: input.entityId.slice(0, 100),
        reason: input.reason ?? null,
        previousValues: input.previousValues ?? null,
        newValues: input.newValues ?? null,
        ipAddress: input.ipAddress ? input.ipAddress.slice(0, 64) : null,
    })
        .returning();
    return created;
};
exports.recordAuditLog = recordAuditLog;
