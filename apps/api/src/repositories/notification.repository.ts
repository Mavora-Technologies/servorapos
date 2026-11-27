// apps/api/src/repositories/notification.repository.ts
import { eq, and, desc, sql, or, ilike, isNull, inArray, type SQL } from 'drizzle-orm';
import { db } from '../config/db';
import { notifications, users, branches } from '../config/schema';

export interface NotificationAccessScope {
  tenantId: number;
  userId: number;
  allowedModules: string[] | 'ALL';
  authorizedBranchIds: number[] | 'ALL';
  activeBranchId?: number | null;
}

export interface NotificationQueryFilters {
  category?: 'ALL' | 'ACTION_REQUIRED' | 'FYI_STREAM' | 'COMPLIANCE_AUDIT';
  severity?: 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module?: string;
  isRead?: 'ALL' | 'TRUE' | 'FALSE';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Builds the mandatory multi-tenant, multi-branch, and RBAC visibility predicate.
 * - Users always see notifications directly addressed to them (`user_id = userId`).
 * - Users only see broadcast notifications (`user_id IS NULL`) for modules cleared by their permissions.
 * - Users only see notifications for their authorized branch(es) or tenant-wide (`branch_id IS NULL`).
 */
function buildAccessScopeConditions(scope: NotificationAccessScope): SQL[] {
  const conditions: SQL[] = [eq(notifications.tenantId, scope.tenantId)];

  // 1. User / Module RBAC Visibility
  if (scope.allowedModules === 'ALL') {
    conditions.push(or(eq(notifications.userId, scope.userId), isNull(notifications.userId))!);
  } else if (scope.allowedModules.length > 0) {
    conditions.push(
      or(
        eq(notifications.userId, scope.userId),
        and(isNull(notifications.userId), inArray(notifications.module, scope.allowedModules))
      )!
    );
  } else {
    conditions.push(eq(notifications.userId, scope.userId));
  }

  // 2. Multi-Branch Isolation
  if (scope.authorizedBranchIds === 'ALL') {
    if (scope.activeBranchId) {
      conditions.push(
        or(eq(notifications.branchId, scope.activeBranchId), isNull(notifications.branchId))!
      );
    }
  } else if (scope.authorizedBranchIds.length > 0) {
    const targetBranches =
      scope.activeBranchId && scope.authorizedBranchIds.includes(scope.activeBranchId)
        ? [scope.activeBranchId]
        : scope.authorizedBranchIds;

    conditions.push(
      or(inArray(notifications.branchId, targetBranches), isNull(notifications.branchId))!
    );
  } else {
    conditions.push(isNull(notifications.branchId));
  }

  return conditions;
}

export const fetchScopedNotifications = async (
  scope: NotificationAccessScope,
  query: NotificationQueryFilters = {}
) => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 50));
  const offset = (page - 1) * limit;

  const conditions: (SQL | undefined)[] = [
    ...buildAccessScopeConditions(scope),
    query.category && query.category !== 'ALL'
      ? eq(notifications.category, query.category)
      : undefined,
    query.severity && query.severity !== 'ALL'
      ? eq(notifications.severity, query.severity)
      : undefined,
    query.module && query.module !== 'ALL' ? eq(notifications.module, query.module) : undefined,
    query.isRead === 'TRUE'
      ? eq(notifications.isRead, true)
      : query.isRead === 'FALSE'
        ? eq(notifications.isRead, false)
        : undefined,
    query.search
      ? or(
          ilike(notifications.title, `%${query.search}%`),
          ilike(notifications.detail, `%${query.search}%`),
          ilike(notifications.module, `%${query.search}%`),
          ilike(notifications.entityId, `%${query.search}%`)
        )
      : undefined,
  ];

  const whereClause = and(...conditions.filter((c): c is SQL => Boolean(c)));

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(whereClause),
    db
      .select({
        id: notifications.id,
        title: notifications.title,
        detail: notifications.detail,
        severity: notifications.severity,
        module: notifications.module,
        category: notifications.category,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        actionUrl: notifications.actionUrl,
        actionPayload: notifications.actionPayload,
        isRead: notifications.isRead,
        isResolved: notifications.isResolved,
        resolvedAt: notifications.resolvedAt,
        createdAt: notifications.createdAt,
        branchName: branches.name,
        resolvedByName: sql<string | null>`NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), '')`,
      })
      .from(notifications)
      .leftJoin(branches, eq(notifications.branchId, branches.id))
      .leftJoin(users, eq(notifications.resolvedByUserId, users.id))
      .where(whereClause)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  return {
    notifications: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const fetchScopedTelemetrySummary = async (scope: NotificationAccessScope) => {
  const whereClause = and(...buildAccessScopeConditions(scope));

  const [counts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unread: sql<number>`count(case when ${notifications.isRead} = false then 1 end)::int`,
      critical: sql<number>`count(case when ${notifications.severity} = 'CRITICAL' and ${notifications.isRead} = false then 1 end)::int`,
      actionRequired: sql<number>`count(case when ${notifications.category} = 'ACTION_REQUIRED' and ${notifications.isResolved} = false then 1 end)::int`,
      warnings: sql<number>`count(case when ${notifications.severity} = 'WARNING' and ${notifications.isRead} = false then 1 end)::int`,
    })
    .from(notifications)
    .where(whereClause);

  return {
    total: Number(counts?.total || 0),
    unread: Number(counts?.unread || 0),
    critical: Number(counts?.critical || 0),
    actionRequired: Number(counts?.actionRequired || 0),
    warnings: Number(counts?.warnings || 0),
  };
};

export const markScopedNotificationAsRead = async (
  scope: NotificationAccessScope,
  notificationId: number
) => {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), ...buildAccessScopeConditions(scope)))
    .returning();
  return updated ?? null;
};

export const markAllScopedNotificationsAsRead = async (scope: NotificationAccessScope) => {
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.isRead, false), ...buildAccessScopeConditions(scope)))
    .returning({ id: notifications.id });
  return updated.length;
};

export const resolveScopedActionableNotification = async (
  scope: NotificationAccessScope,
  notificationId: number,
  notes?: string
) => {
  const [updated] = await db
    .update(notifications)
    .set({
      isRead: true,
      isResolved: true,
      resolvedAt: new Date(),
      resolvedByUserId: scope.userId,
      actionPayload: sql`coalesce(${notifications.actionPayload}, '{}'::jsonb) || jsonb_build_object('resolutionNotes', ${notes || 'Actioned by operator'}::text)`,
    })
    .where(and(eq(notifications.id, notificationId), ...buildAccessScopeConditions(scope)))
    .returning();
  return updated ?? null;
};

export const createSystemNotification = async (data: {
  tenantId: number;
  branchId?: number | null;
  userId?: number | null;
  title: string;
  detail: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module?: string;
  category?: 'ACTION_REQUIRED' | 'FYI_STREAM' | 'COMPLIANCE_AUDIT';
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionPayload?: Record<string, unknown>;
}) => {
  const [created] = await db
    .insert(notifications)
    .values({
      tenantId: data.tenantId,
      branchId: data.branchId ?? null,
      userId: data.userId ?? null,
      title: data.title,
      detail: data.detail,
      severity: data.severity || 'INFO',
      module: data.module || 'SYSTEM',
      category: data.category || 'FYI_STREAM',
      entityType: data.entityType || null,
      entityId: data.entityId || null,
      actionUrl: data.actionUrl || null,
      actionPayload: data.actionPayload || null,
      isRead: false,
      isResolved: false,
    })
    .returning();
  return created;
};