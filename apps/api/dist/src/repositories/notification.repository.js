"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemNotification = exports.resolveScopedActionableNotification = exports.markAllScopedNotificationsAsRead = exports.markScopedNotificationAsRead = exports.fetchScopedTelemetrySummary = exports.fetchScopedNotifications = void 0;
// apps/api/src/repositories/notification.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
/**
 * Builds the mandatory multi-tenant, multi-branch, and RBAC visibility predicate.
 * - Users always see notifications directly addressed to them (`user_id = userId`).
 * - Users only see broadcast notifications (`user_id IS NULL`) for modules cleared by their permissions.
 * - Users only see notifications for their authorized branch(es) or tenant-wide (`branch_id IS NULL`).
 */
function buildAccessScopeConditions(scope) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.notifications.tenantId, scope.tenantId)];
    // 1. User / Module RBAC Visibility
    if (scope.allowedModules === 'ALL') {
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.notifications.userId, scope.userId), (0, drizzle_orm_1.isNull)(schema_1.notifications.userId)));
    }
    else if (scope.allowedModules.length > 0) {
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.notifications.userId, scope.userId), (0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(schema_1.notifications.userId), (0, drizzle_orm_1.inArray)(schema_1.notifications.module, scope.allowedModules))));
    }
    else {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.notifications.userId, scope.userId));
    }
    // 2. Multi-Branch Isolation
    if (scope.authorizedBranchIds === 'ALL') {
        if (scope.activeBranchId) {
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.notifications.branchId, scope.activeBranchId), (0, drizzle_orm_1.isNull)(schema_1.notifications.branchId)));
        }
    }
    else if (scope.authorizedBranchIds.length > 0) {
        const targetBranches = scope.activeBranchId && scope.authorizedBranchIds.includes(scope.activeBranchId)
            ? [scope.activeBranchId]
            : scope.authorizedBranchIds;
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.notifications.branchId, targetBranches), (0, drizzle_orm_1.isNull)(schema_1.notifications.branchId)));
    }
    else {
        conditions.push((0, drizzle_orm_1.isNull)(schema_1.notifications.branchId));
    }
    return conditions;
}
const fetchScopedNotifications = async (scope, query = {}) => {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 50));
    const offset = (page - 1) * limit;
    const conditions = [
        ...buildAccessScopeConditions(scope),
        query.category && query.category !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.notifications.category, query.category)
            : undefined,
        query.severity && query.severity !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.notifications.severity, query.severity)
            : undefined,
        query.module && query.module !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.notifications.module, query.module) : undefined,
        query.isRead === 'TRUE'
            ? (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, true)
            : query.isRead === 'FALSE'
                ? (0, drizzle_orm_1.eq)(schema_1.notifications.isRead, false)
                : undefined,
        query.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.notifications.title, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.notifications.detail, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.notifications.module, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.notifications.entityId, `%${query.search}%`))
            : undefined,
    ];
    const whereClause = (0, drizzle_orm_1.and)(...conditions.filter((c) => Boolean(c)));
    const [countResult, rows] = await Promise.all([
        db_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_1.notifications)
            .where(whereClause),
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
            resolvedByName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), '')`,
        })
            .from(schema_1.notifications)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.notifications.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.notifications.resolvedByUserId, schema_1.users.id))
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.notifications.createdAt))
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
exports.fetchScopedNotifications = fetchScopedNotifications;
const fetchScopedTelemetrySummary = async (scope) => {
    const whereClause = (0, drizzle_orm_1.and)(...buildAccessScopeConditions(scope));
    const [counts] = await db_1.db
        .select({
        total: (0, drizzle_orm_1.sql) `count(*)::int`,
        unread: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.isRead} = false then 1 end)::int`,
        critical: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.severity} = 'CRITICAL' and ${schema_1.notifications.isRead} = false then 1 end)::int`,
        actionRequired: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.category} = 'ACTION_REQUIRED' and ${schema_1.notifications.isResolved} = false then 1 end)::int`,
        warnings: (0, drizzle_orm_1.sql) `count(case when ${schema_1.notifications.severity} = 'WARNING' and ${schema_1.notifications.isRead} = false then 1 end)::int`,
    })
        .from(schema_1.notifications)
        .where(whereClause);
    return {
        total: Number(counts?.total || 0),
        unread: Number(counts?.unread || 0),
        critical: Number(counts?.critical || 0),
        actionRequired: Number(counts?.actionRequired || 0),
        warnings: Number(counts?.warnings || 0),
    };
};
exports.fetchScopedTelemetrySummary = fetchScopedTelemetrySummary;
const markScopedNotificationAsRead = async (scope, notificationId) => {
    const [updated] = await db_1.db
        .update(schema_1.notifications)
        .set({ isRead: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId), ...buildAccessScopeConditions(scope)))
        .returning();
    return updated ?? null;
};
exports.markScopedNotificationAsRead = markScopedNotificationAsRead;
const markAllScopedNotificationsAsRead = async (scope) => {
    const updated = await db_1.db
        .update(schema_1.notifications)
        .set({ isRead: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.isRead, false), ...buildAccessScopeConditions(scope)))
        .returning({ id: schema_1.notifications.id });
    return updated.length;
};
exports.markAllScopedNotificationsAsRead = markAllScopedNotificationsAsRead;
const resolveScopedActionableNotification = async (scope, notificationId, notes) => {
    const [updated] = await db_1.db
        .update(schema_1.notifications)
        .set({
        isRead: true,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedByUserId: scope.userId,
        actionPayload: (0, drizzle_orm_1.sql) `coalesce(${schema_1.notifications.actionPayload}, '{}'::jsonb) || jsonb_build_object('resolutionNotes', ${notes || 'Actioned by operator'}::text)`,
    })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.notifications.id, notificationId), ...buildAccessScopeConditions(scope)))
        .returning();
    return updated ?? null;
};
exports.resolveScopedActionableNotification = resolveScopedActionableNotification;
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
