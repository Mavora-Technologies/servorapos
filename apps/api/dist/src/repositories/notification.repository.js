"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemNotification = exports.resolveActionableNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.fetchNotificationTelemetrySummary = exports.fetchTenantNotifications = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const fetchTenantNotifications = async (tenantId, query = {}) => {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId),
        query.category && query.category !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.notifications.category, query.category) : undefined,
        query.severity && query.severity !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.notifications.severity, query.severity) : undefined,
        query.module && query.module !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.notifications.module, query.module) : undefined,
        query.isRead === 'TRUE'
            ? (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, true)
            : query.isRead === 'FALSE'
                ? (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, false)
                : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.notifications.title, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.notifications.detail, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.notifications.module, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.notifications)
            .where((0, drizzle_orm_1.and)(...conditions)),
        db_1.db
            .select({
            id: schema_1.notifications.id,
            title: schema_1.notifications.title,
            detail: schema_1.notifications.detail,
            severity: schema_1.notifications.severity,
            module: schema_1.notifications.module,
            category: schema_1.notifications.category,
            entityType: schema_1.notifications.entityType,
            entityId: schema_1.notifications.entityId,
            actionUrl: schema_1.notifications.actionUrl,
            actionPayload: schema_1.notifications.actionPayload,
            isRead: schema_1.notifications.isRead,
            isResolved: schema_1.notifications.isResolved,
            resolvedAt: schema_1.notifications.resolvedAt,
            createdAt: schema_1.notifications.createdAt,
            branchName: schema_1.branches.name,
            resolvedByName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        })
            .from(schema_1.notifications)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.notifications.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.notifications.resolvedByUserId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
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
exports.fetchTenantNotifications = fetchTenantNotifications;
const fetchNotificationTelemetrySummary = async (tenantId) => {
    const [counts] = await db_1.db
        .select({
        total: (0, drizzle_orm_1.sql) `count(*)`,
        unread: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.isRead} = false then 1 end)`,
        critical: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.severity} = 'CRITICAL' and ${schema_1.notifications.isRead} = false then 1 end)`,
        actionRequired: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.category} = 'ACTION_REQUIRED' and ${schema_1.notifications.isResolved} = false then 1 end)`,
        warnings: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.severity} = 'WARNING' and ${schema_1.notifications.isRead} = false then 1 end)`,
    })
        .from(schema_1.notifications)
        .where((0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId));
    return {
        total: Number(counts?.total || 0),
        unread: Number(counts?.unread || 0),
        critical: Number(counts?.critical || 0),
        actionRequired: Number(counts?.actionRequired || 0),
        warnings: Number(counts?.warnings || 0),
    };
};
exports.fetchNotificationTelemetrySummary = fetchNotificationTelemetrySummary;
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
const resolveActionableNotification = async (tenantId, userId, notificationId, notes) => {
    const [updated] = await db_1.db
        .update(schema_1.notifications)
        .set({
        isRead: true,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedByUserId: userId,
        actionPayload: (0, drizzle_orm_1.sql) `coalesce(action_payload, '{}'::jsonb) || jsonb_build_object('resolutionNotes', ${notes || 'Actioned by operator'}::text)`,
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId), (0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, tenantId)))
        .returning();
    return updated;
};
exports.resolveActionableNotification = resolveActionableNotification;
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
exports.createSystemNotification = createSystemNotification;
