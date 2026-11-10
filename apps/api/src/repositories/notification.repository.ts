import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import { notifications, users, branches } from '../config/schema';

export interface NotificationQueryFilters {
  category?: 'ALL' | 'ACTION_REQUIRED' | 'FYI_STREAM' | 'COMPLIANCE_AUDIT';
  severity?: 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module?: string;
  isRead?: 'ALL' | 'TRUE' | 'FALSE';
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchTenantNotifications = async (tenantId: number, query: NotificationQueryFilters = {}) => {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(notifications.tenantId, tenantId),
    query.category && query.category !== 'ALL' ? eq(notifications.category, query.category) : undefined,
    query.severity && query.severity !== 'ALL' ? eq(notifications.severity, query.severity) : undefined,
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
          ilike(notifications.module, `%${query.search}%`)
        )
      : undefined,
  ].filter(Boolean);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(...conditions)),
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
        resolvedByName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      })
      .from(notifications)
      .leftJoin(branches, eq(notifications.branchId, branches.id))
      .leftJoin(users, eq(notifications.resolvedByUserId, users.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count || 0);

  // Clean production behavior: return real data or an empty array
  return {
    notifications: rows,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const fetchNotificationTelemetrySummary = async (tenantId: number) => {
  const [counts] = await db
    .select({
      total: sql<number>`count(*)`,
      unread: sql<number>`count(case when ${notifications.isRead} = false then 1 end)`,
      critical: sql<number>`count(case when ${notifications.severity} = 'CRITICAL' and ${notifications.isRead} = false then 1 end)`,
      actionRequired: sql<number>`count(case when ${notifications.category} = 'ACTION_REQUIRED' and ${notifications.isResolved} = false then 1 end)`,
      warnings: sql<number>`count(case when ${notifications.severity} = 'WARNING' and ${notifications.isRead} = false then 1 end)`,
    })
    .from(notifications)
    .where(eq(notifications.tenantId, tenantId));

  return {
    total: Number(counts?.total || 0),
    unread: Number(counts?.unread || 0),
    critical: Number(counts?.critical || 0),
    actionRequired: Number(counts?.actionRequired || 0),
    warnings: Number(counts?.warnings || 0),
  };
};

export const markNotificationAsRead = async (tenantId: number, notificationId: number) => {
  const [updated] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.tenantId, tenantId)))
    .returning();
  return updated;
};

export const markAllNotificationsAsRead = async (tenantId: number) => {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)));
};

export const resolveActionableNotification = async (
  tenantId: number,
  userId: number,
  notificationId: number,
  notes?: string
) => {
  const [updated] = await db
    .update(notifications)
    .set({
      isRead: true,
      isResolved: true,
      resolvedAt: new Date(),
      resolvedByUserId: userId,
      actionPayload: sql`coalesce(action_payload, '{}'::jsonb) || jsonb_build_object('resolutionNotes', ${notes || 'Actioned by operator'}::text)`,
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.tenantId, tenantId)))
    .returning();
  return updated;
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
  actionPayload?: Record<string, any>;
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