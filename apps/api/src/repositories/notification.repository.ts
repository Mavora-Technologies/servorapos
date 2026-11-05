// apps/api/src/repositories/notification.repository.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../config/db';
import { notifications } from '../config/schema';

export const fetchTenantNotifications = async (tenantId: number, limit = 50) => {
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.tenantId, tenantId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
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

export const createSystemNotification = async (data: {
  tenantId: number;
  branchId?: number | null;
  userId?: number | null;
  title: string;
  detail: string;
  severity?: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module?: string;
  actionUrl?: string;
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
      actionUrl: data.actionUrl || null,
      isRead: false,
    })
    .returning();
  return created;
};