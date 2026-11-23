// apps/api/src/repositories/audit-log.repository.ts
import { eq, and, desc, asc, sql, gte, lte, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import { auditLogs, users, branches } from '../config/schema';
import type { ListAuditLogsQuery, RecordAuditLogInput } from '../validators/audit-log.validator';

function parseStartDate(raw: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`);
  }
  return new Date(raw);
}

function parseEndDate(raw: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T23:59:59.999Z`);
  }
  return new Date(raw);
}

export const listAuditLogs = async (tenantId: number, query: ListAuditLogsQuery) => {
  const page = query.page || 1;
  const limit = query.limit || 25;
  const offset = (page - 1) * limit;

  const conditions = [eq(auditLogs.tenantId, tenantId)];

  if (query.module && query.module !== 'ALL') {
    conditions.push(eq(auditLogs.module, query.module));
  }
  if (query.action && query.action !== 'ALL') {
    conditions.push(eq(auditLogs.action, query.action));
  }
  if (query.userId) {
    conditions.push(eq(auditLogs.userId, query.userId));
  }
  if (query.branchId) {
    conditions.push(eq(auditLogs.branchId, query.branchId));
  }
  if (query.entityType && query.entityType !== 'ALL') {
    conditions.push(eq(auditLogs.entityType, query.entityType));
  }
  if (query.entityId) {
    conditions.push(eq(auditLogs.entityId, query.entityId));
  }
  if (query.startDate) {
    conditions.push(gte(auditLogs.createdAt, parseStartDate(query.startDate)));
  }
  if (query.endDate) {
    conditions.push(lte(auditLogs.createdAt, parseEndDate(query.endDate)));
  }
  if (query.search) {
    const pattern = `%${query.search}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.module, pattern),
        ilike(auditLogs.entityType, pattern),
        ilike(auditLogs.entityId, pattern),
        ilike(auditLogs.reason, pattern),
        ilike(auditLogs.ipAddress, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(users.email, pattern)
      )!
    );
  }

  const [countResult, records] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .leftJoin(
        users,
        and(eq(auditLogs.userId, users.id), eq(users.tenantId, tenantId))
      )
      .where(and(...conditions)),

    db
      .select({
        id: auditLogs.id,
        tenantId: auditLogs.tenantId,
        branchId: auditLogs.branchId,
        branchName: branches.name,
        branchCode: branches.code,
        userId: auditLogs.userId,
        actorName: sql<string | null>`NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), '')`,
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
      .leftJoin(
        users,
        and(eq(auditLogs.userId, users.id), eq(users.tenantId, tenantId))
      )
      .leftJoin(
        branches,
        and(eq(auditLogs.branchId, branches.id), eq(branches.tenantId, tenantId))
      )
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
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

export const getAuditLogById = async (tenantId: number, id: number) => {
  const [record] = await db
    .select({
      id: auditLogs.id,
      tenantId: auditLogs.tenantId,
      branchId: auditLogs.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      userId: auditLogs.userId,
      actorName: sql<string | null>`NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), '')`,
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
    .leftJoin(
      users,
      and(eq(auditLogs.userId, users.id), eq(users.tenantId, tenantId))
    )
    .leftJoin(
      branches,
      and(eq(auditLogs.branchId, branches.id), eq(branches.tenantId, tenantId))
    )
    .where(and(eq(auditLogs.id, id), eq(auditLogs.tenantId, tenantId)))
    .limit(1);

  return record ?? null;
};

export const getAuditLogTelemetry = async (tenantId: number) => {
  const [totalsResult, modulesResult, actorsResult] = await Promise.all([
    db
      .select({
        totalEvents: sql<number>`count(*)::int`,
        last24Hours: sql<number>`count(case when ${auditLogs.createdAt} >= now() - interval '24 hours' then 1 end)::int`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId)),

    db
      .select({
        module: auditLogs.module,
        count: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .groupBy(auditLogs.module)
      .orderBy(desc(sql`count(*)`)),

    db
      .select({
        distinctUsers: sql<number>`count(distinct ${auditLogs.userId})::int`,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.tenantId, tenantId), sql`${auditLogs.userId} is not null`)),
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
      .innerJoin(
        users,
        and(eq(auditLogs.userId, users.id), eq(users.tenantId, tenantId))
      )
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