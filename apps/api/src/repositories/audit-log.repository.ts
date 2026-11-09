import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import { auditLogs, users, branches } from '../config/schema';
import { ListAuditLogsQuery, RecordAuditLogInput } from '../validators/audit-log.validator';

export const listAuditLogs = async (tenantId: number, query: ListAuditLogsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(auditLogs.tenantId, tenantId),
    query.module && query.module !== 'ALL' ? eq(auditLogs.module, query.module) : undefined,
    query.action && query.action !== 'ALL' ? eq(auditLogs.action, query.action) : undefined,
    query.userId ? eq(auditLogs.userId, query.userId) : undefined,
    query.branchId ? eq(auditLogs.branchId, query.branchId) : undefined,
    query.entityType && query.entityType !== 'ALL' ? eq(auditLogs.entityType, query.entityType) : undefined,
    query.entityId ? eq(auditLogs.entityId, query.entityId) : undefined,
    query.startDate ? gte(auditLogs.createdAt, new Date(query.startDate)) : undefined,
    query.endDate ? lte(auditLogs.createdAt, new Date(query.endDate)) : undefined,
    query.search
      ? or(
          ilike(auditLogs.action, `%${query.search}%`),
          ilike(auditLogs.entityType, `%${query.search}%`),
          ilike(auditLogs.entityId, `%${query.search}%`),
          ilike(auditLogs.reason, `%${query.search}%`),
          ilike(users.firstName, `%${query.search}%`),
          ilike(users.lastName, `%${query.search}%`),
          ilike(users.email, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, records] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(...conditions)),
    db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        branchId: auditLogs.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        userId: auditLogs.userId,
        actorName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        actorEmail: users.email,
        actorRole: users.role,
        action: auditLogs.action,
        module: auditLogs.module,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        reason: auditLogs.reason,
        previousValues: auditLogs.previousValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(branches, eq(auditLogs.branchId, branches.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getAuditLogById = async (tenantId: number, id: number) => {
  const [record] = await db
    .select({
      id: auditLogs.id,
      tenantId: auditLogs.tenantId,
      branchId: auditLogs.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      userId: auditLogs.userId,
      actorName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      actorEmail: users.email,
      actorRole: users.role,
      action: auditLogs.action,
      module: auditLogs.module,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      reason: auditLogs.reason,
      previousValues: auditLogs.previousValues,
      newValues: auditLogs.newValues,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(branches, eq(auditLogs.branchId, branches.id))
    .where(and(eq(auditLogs.id, id), eq(auditLogs.tenantId, tenantId)))
    .limit(1);

  return record || null;
};

export const getAuditLogTelemetry = async (tenantId: number) => {
  const [totalsResult, modulesResult, actorsResult] = await Promise.all([
    db
      .select({
        totalEvents: sql<number>`count(*)`,
        last24Hours: sql<number>`count(case when ${auditLogs.createdAt} >= now() - interval '24 hours' then 1 end)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId)),
    db
      .select({
        module: auditLogs.module,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .groupBy(auditLogs.module)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        distinctUsers: sql<number>`count(distinct ${auditLogs.userId})`,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), sql`${auditLogs.userId} is not null`)),
  ]);

  return {
    totalEvents: Number(totalsResult[0]?.totalEvents || 0),
    eventsLast24Hours: Number(totalsResult[0]?.last24Hours || 0),
    activeActors: Number(actorsResult[0]?.distinctUsers || 0),
    moduleBreakdown: modulesResult.map((m) => ({ module: m.module, count: Number(m.count) })),
  };
};

export const getDynamicFilterOptions = async (tenantId: number) => {
  const [modules, actions, entityTypes, actors] = await Promise.all([
    db
      .selectDistinct({ module: auditLogs.module })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(asc(auditLogs.module)),
    db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(asc(auditLogs.action)),
    db
      .selectDistinct({ entityType: auditLogs.entityType })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(asc(auditLogs.entityType)),
    db
      .selectDistinct({
        id: users.id,
        name: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        email: users.email,
      })
      .from(auditLogs)
      .innerJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(asc(users.firstName)),
  ]);

  return {
    modules: modules.map((m) => m.module),
    actions: actions.map((a) => a.action),
    entityTypes: entityTypes.map((e) => e.entityType),
    actors,
  };
};

export const recordAuditLog = async (tenantId: number, input: RecordAuditLogInput) => {
  const [created] = await db
    .insert(auditLogs)
    .values({
      tenantId,
      branchId: input.branchId || null,
      userId: input.userId || null,
      action: input.action,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason || null,
      previousValues: input.previousValues || null,
      newValues: input.newValues || null,
      ipAddress: input.ipAddress || null,
    })
    .returning();

  return created;
};