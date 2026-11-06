"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.fetchTenantNotifications = void 0;
// apps/api/src/repositories/notification.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const fetchTenantNotifications = async (tenantId, limit = 50) => {
    return await db_1.db
        .select()
        .from(schema_1.notifications)
        .where((0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
        .limit(limit);
};
exports.fetchTenantNotifications = fetchTenantNotifications;
const markNotificationAsRead = async (tenantId, notificationId) => {
    const [updated] = await db_1.db
        .update(schema_1.notifications)
        .set({ isRead: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId), (0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (tenantId) => {
    await db_1.db
        .update(schema_1.notifications)
        .set({ isRead: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, false)));
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
const createSystemNotification = async (data) => {
    const [created] = await db_1.db
        .insert(schema_1.notifications)
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
exports.createSystemNotification = createSystemNotification;
