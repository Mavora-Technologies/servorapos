"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertKitchenGlobalSettingsRecord = exports.deleteKitchenStationRecord = exports.updateKitchenStationRecord = exports.createKitchenStationRecord = exports.listTenantMenuCategoriesForRouting = exports.getKitchenGlobalSettingsRecord = exports.listConfiguredKitchenStations = exports.bumpStationItemsOnOrder = exports.getStationWorkloadSummary = exports.getKitchenPerformanceStats = exports.getKitchenHistoryTickets = exports.updateLineItemKitchenStatus = exports.updateTicketStatus = exports.getActiveKitchenTickets = exports.getDistinctTenantKitchenStations = void 0;
// apps/api/src/repositories/kitchen.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
// ============================================================================
// SHARED SQL EXPRESSIONS FOR LINE-LEVEL STATION ROUTING & CLEAN NOTES
// ============================================================================
const resolvedItemStationSql = (0, drizzle_orm_1.sql) `COALESCE(
  NULLIF(SUBSTRING(${schema_1.orderItems.notes} FROM '\\[STATION:([^\\]]+)\\]'), ''),
  NULLIF(TRIM(${schema_1.menuItems.kitchenStation}), ''),
  'Main Kitchen'
)`;
const cleanItemNotesSql = (0, drizzle_orm_1.sql) `NULLIF(
  TRIM(REGEXP_REPLACE(COALESCE(${schema_1.orderItems.notes}, ''), '\\[STATION:[^\\]]+\\]\\s*', '')),
  ''
)`;
// ============================================================================
// ACTIVE KDS TICKETS, WORKLOAD TELEMETRY & STATION BUMP OPERATIONS
// ============================================================================
const getDistinctTenantKitchenStations = async (tenantId) => {
    const [menuRows, configuredRows, activeRoutedRows] = await Promise.all([
        db_1.db
            .selectDistinct({
            station: schema_1.menuItems.kitchenStation,
        })
            .from(schema_1.menuItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.isNotNull)(schema_1.menuItems.kitchenStation), (0, drizzle_orm_1.sql) `TRIM(${schema_1.menuItems.kitchenStation}) != ''`)),
        db_1.db
            .select({
            name: schema_1.kitchenStations.name,
        })
            .from(schema_1.kitchenStations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.kitchenStations.isActive, true))),
        db_1.db
            .selectDistinct({
            station: resolvedItemStationSql,
        })
            .from(schema_1.orderItems)
            .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id))
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing']))),
    ]);
    const stationSet = new Set();
    menuRows.forEach((r) => {
        if (r.station)
            stationSet.add(r.station.trim());
    });
    configuredRows.forEach((r) => {
        if (r.name)
            stationSet.add(r.name.trim());
    });
    activeRoutedRows.forEach((r) => {
        if (r.station)
            stationSet.add(r.station.trim());
    });
    return Array.from(stationSet).sort();
};
exports.getDistinctTenantKitchenStations = getDistinctTenantKitchenStations;
const getActiveKitchenTickets = async (tenantId, query = {}) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing']),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined,
        query.orderType && query.orderType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.orders.orderType, query.orderType)
            : undefined,
        query.station && query.station !== 'ALL'
            ? (0, drizzle_orm_1.sql) `(
          LOWER(TRIM(${resolvedItemStationSql})) = LOWER(TRIM(${query.station}))
          OR EXISTS (
            SELECT 1
            FROM kitchen_stations ks
            WHERE ks.tenant_id = ${tenantId}
              AND LOWER(TRIM(ks.name)) = LOWER(TRIM(${query.station}))
              AND (
                EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements_text(ks.assigned_categories) AS cat
                  WHERE LOWER(TRIM(cat)) = 'all'
                     OR LOWER(TRIM(cat)) = LOWER(TRIM(${resolvedItemStationSql}))
                     OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(${schema_1.menuCategories.name}, '')))
                )
                OR (
                  ks.station_type = 'BAR'
                  AND (
                    LOWER(${resolvedItemStationSql}) LIKE '%bar%'
                    OR LOWER(${resolvedItemStationSql}) LIKE '%beverage%'
                  )
                )
              )
          )
        )`
            : undefined,
    ].filter(Boolean);
    const flatTickets = await db_1.db
        .select({
        id: schema_1.orders.id,
        branchId: schema_1.orders.branchId,
        branchName: schema_1.branches.name,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        tableName: schema_1.orders.tableName,
        customerName: schema_1.orders.customerName,
        orderNotes: schema_1.orders.notes,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        createdAt: schema_1.orders.createdAt,
        orderItemId: schema_1.orderItems.id,
        quantity: schema_1.orderItems.quantity,
        kitchenStatus: schema_1.orderItems.kitchenStatus,
        itemNotes: cleanItemNotesSql,
        selectedModifiers: schema_1.orderItems.selectedModifiers,
        menuItemName: schema_1.menuItems.name,
        resolvedStation: resolvedItemStationSql,
        prepTimeMinutes: schema_1.menuItems.prepTimeMinutes,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .leftJoin(schema_1.menuCategories, (0, drizzle_orm_1.eq)(schema_1.menuItems.categoryId, schema_1.menuCategories.id))
        .where((0, drizzle_orm_1.and)(...conditions));
    const grouped = flatTickets.reduce((acc, row) => {
        if (!acc[row.id]) {
            acc[row.id] = {
                id: row.id,
                branchId: row.branchId,
                branchName: row.branchName,
                orderNumber: row.orderNumber,
                orderType: row.orderType,
                tableName: row.tableName,
                customerName: row.customerName,
                notes: row.orderNotes,
                status: row.status === 'Sent-To-Kitchen' ? 'Confirmed' : row.status,
                paymentStatus: row.paymentStatus,
                createdAt: row.createdAt,
                items: [],
            };
        }
        if (row.orderItemId) {
            acc[row.id].items.push({
                id: row.orderItemId,
                quantity: Number(row.quantity),
                name: row.menuItemName || 'Menu Item',
                station: row.resolvedStation || 'Main Kitchen',
                kitchenStatus: row.kitchenStatus || 'New',
                prepTimeMinutes: row.prepTimeMinutes || 15,
                notes: row.itemNotes,
                modifiers: row.selectedModifiers || [],
            });
        }
        return acc;
    }, {});
    // FIFO chronological queue (oldest tickets first)
    return Object.values(grouped).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};
exports.getActiveKitchenTickets = getActiveKitchenTickets;
const updateTicketStatus = async (tenantId, userId, orderId, status) => {
    return await db_1.db.transaction(async (tx) => {
        const [updatedOrder] = await tx
            .update(schema_1.orders)
            .set({ status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        if (!updatedOrder) {
            throw new Error('Kitchen ticket not found');
        }
        if (status === 'Preparing' || status === 'Ready') {
            await tx
                .update(schema_1.orderItems)
                .set({ kitchenStatus: status })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)));
        }
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updatedOrder.branchId ?? null,
            userId,
            action: `KDS_TICKET_${status.toUpperCase()}`,
            module: 'KITCHEN',
            entityType: 'orders',
            entityId: String(orderId),
            reason: `Kitchen ticket ${updatedOrder.orderNumber} bumped to ${status}`,
        });
        return updatedOrder;
    });
};
exports.updateTicketStatus = updateTicketStatus;
const updateLineItemKitchenStatus = async (tenantId, orderItemId, kitchenStatus) => {
    const [updated] = await db_1.db
        .update(schema_1.orderItems)
        .set({ kitchenStatus })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.id, orderItemId), (0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId)))
        .returning();
    if (!updated) {
        throw new Error('Order line item not found');
    }
    return updated;
};
exports.updateLineItemKitchenStatus = updateLineItemKitchenStatus;
const getKitchenHistoryTickets = async (tenantId, query = {}) => {
    const statusList = query.status && query.status !== 'ALL'
        ? [query.status]
        : ['Completed', 'Ready', 'Cancelled', 'Served'];
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.inArray)(schema_1.orders.status, statusList),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined,
        query.orderType && query.orderType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.orders.orderType, query.orderType)
            : undefined,
        query.startDate
            ? (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, new Date(`${query.startDate}T00:00:00.000Z`))
            : undefined,
        query.endDate
            ? (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, new Date(`${query.endDate}T23:59:59.999Z`))
            : undefined,
    ].filter(Boolean);
    // Fetch active tenant users from DB to resolve real full names (never synthetic labels)
    const [tenantUsers, flatTickets] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.users.id,
            fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
            defaultBranchId: schema_1.users.defaultBranchId,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.id)),
        db_1.db
            .select({
            id: schema_1.orders.id,
            branchId: schema_1.orders.branchId,
            branchName: schema_1.branches.name,
            orderNumber: schema_1.orders.orderNumber,
            orderType: schema_1.orders.orderType,
            tableName: schema_1.orders.tableName,
            customerName: schema_1.orders.customerName,
            status: schema_1.orders.status,
            paymentStatus: schema_1.orders.paymentStatus,
            total: schema_1.orders.total,
            createdAt: schema_1.orders.createdAt,
            updatedAt: schema_1.orders.updatedAt,
            placedByName: (0, drizzle_orm_1.sql) `COALESCE(
          NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), ''),
          (SELECT NULLIF(TRIM(CONCAT(w.first_name, ' ', w.last_name)), '') FROM users w WHERE w.id = ${schema_1.orders.waiterId}),
          (SELECT NULLIF(TRIM(CONCAT(pu.first_name, ' ', pu.last_name)), '') FROM payments p JOIN users pu ON p.processed_by_id = pu.id WHERE p.order_id = ${schema_1.orders.id} ORDER BY p.id DESC LIMIT 1)
        )`,
            placedByRole: (0, drizzle_orm_1.sql) `COALESCE(
          ${schema_1.users.role},
          (SELECT w.role FROM users w WHERE w.id = ${schema_1.orders.waiterId}),
          (SELECT pu.role FROM payments p JOIN users pu ON p.processed_by_id = pu.id WHERE p.order_id = ${schema_1.orders.id} ORDER BY p.id DESC LIMIT 1)
        )`,
            orderItemId: schema_1.orderItems.id,
            quantity: schema_1.orderItems.quantity,
            menuItemName: schema_1.menuItems.name,
            prepTimeMinutes: schema_1.menuItems.prepTimeMinutes,
            resolvedStation: resolvedItemStationSql,
            itemNotes: cleanItemNotesSql,
        })
            .from(schema_1.orders)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, schema_1.users.id))
            .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.updatedAt))
            .limit((query.limit || 150) * 5),
    ]);
    const primaryTenantUser = tenantUsers[0] || null;
    const resolveBranchStaffFallback = (branchId, preferredRoles) => {
        const byBranchAndRole = tenantUsers.find((u) => u.defaultBranchId === branchId && preferredRoles.includes(u.role));
        if (byBranchAndRole)
            return byBranchAndRole;
        const byRole = tenantUsers.find((u) => preferredRoles.includes(u.role));
        if (byRole)
            return byRole;
        const byBranch = tenantUsers.find((u) => u.defaultBranchId === branchId);
        if (byBranch)
            return byBranch;
        return primaryTenantUser;
    };
    const groupedMap = flatTickets.reduce((acc, row) => {
        if (!acc[row.id]) {
            const fohFallback = resolveBranchStaffFallback(row.branchId, [
                'CASHIER',
                'WAITER',
                'MANAGER',
                'ADMIN',
                'SUPER_ADMIN',
            ]);
            acc[row.id] = {
                id: row.id,
                branchId: row.branchId,
                branchName: row.branchName || 'Main Outlet',
                orderNumber: row.orderNumber,
                orderType: row.orderType,
                tableName: row.tableName,
                customerName: row.customerName,
                status: row.status,
                paymentStatus: row.paymentStatus,
                total: Number(row.total || 0),
                placedByName: row.placedByName || fohFallback?.fullName || 'Unassigned Staff',
                placedByRole: row.placedByRole || fohFallback?.role || '',
                createdAt: row.createdAt,
                completedAt: row.updatedAt,
                items: [],
            };
        }
        if (row.orderItemId) {
            acc[row.id].items.push({
                id: row.orderItemId,
                quantity: Number(row.quantity),
                name: row.menuItemName || 'Menu Item',
                station: row.resolvedStation || 'Main Kitchen',
                targetPrepMins: row.prepTimeMinutes || 15,
                notes: row.itemNotes,
            });
        }
        return acc;
    }, {});
    let tickets = Object.values(groupedMap);
    if (query.station && query.station !== 'ALL') {
        const stLower = query.station.toLowerCase();
        tickets = tickets.filter((t) => t.items.some((i) => (i.station || '').toLowerCase() === stLower));
    }
    if (query.search && query.search.trim()) {
        const q = query.search.trim().toLowerCase();
        tickets = tickets.filter((t) => t.orderNumber.toLowerCase().includes(q) ||
            (t.tableName && t.tableName.toLowerCase().includes(q)) ||
            (t.customerName && t.customerName.toLowerCase().includes(q)) ||
            (t.placedByName && t.placedByName.toLowerCase().includes(q)) ||
            t.items.some((i) => i.name.toLowerCase().includes(q)));
    }
    tickets = tickets.slice(0, query.limit || 150);
    if (tickets.length === 0)
        return [];
    // Batch-fetch KDS & Order audit trail events for staff execution attribution
    const orderIds = tickets.map((t) => String(t.id));
    const auditEvents = await db_1.db
        .select({
        entityId: schema_1.auditLogs.entityId,
        module: schema_1.auditLogs.module,
        action: schema_1.auditLogs.action,
        reason: schema_1.auditLogs.reason,
        createdAt: schema_1.auditLogs.createdAt,
        actorName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), '')`,
        actorRole: schema_1.users.role,
    })
        .from(schema_1.auditLogs)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.auditLogs.entityType, 'orders'), (0, drizzle_orm_1.inArray)(schema_1.auditLogs.entityId, orderIds)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.auditLogs.createdAt));
    const auditsByOrderId = new Map();
    for (const ev of auditEvents) {
        const arr = auditsByOrderId.get(ev.entityId) || [];
        arr.push(ev);
        auditsByOrderId.set(ev.entityId, arr);
    }
    const enriched = tickets.map((t) => {
        const events = auditsByOrderId.get(String(t.id)) || [];
        const fireEvent = events.find((e) => e.action === 'KDS_TICKET_PREPARING');
        const readyEvent = [...events]
            .reverse()
            .find((e) => e.action === 'KDS_TICKET_READY' ||
            e.action === 'KDS_STATION_ITEMS_BUMPED' ||
            e.action === 'KDS_TICKET_COMPLETED' ||
            e.action === 'ORDER_STATUS_COMPLETED' ||
            e.action === 'ORDER_STATUS_READY');
        const lastKdsEvent = [...events]
            .reverse()
            .find((e) => e.module === 'KITCHEN' || e.action.startsWith('KDS_'));
        const bohFallback = resolveBranchStaffFallback(t.branchId, [
            'HEAD_CHEF',
            'CHEF',
            'MANAGER',
            'ADMIN',
            'SUPER_ADMIN',
        ]);
        const createdMs = new Date(t.createdAt).getTime();
        const firedMs = fireEvent ? new Date(fireEvent.createdAt).getTime() : createdMs;
        const readyMs = readyEvent
            ? new Date(readyEvent.createdAt).getTime()
            : new Date(t.completedAt).getTime();
        const completedMs = new Date(t.completedAt).getTime();
        const prepDurationMinutes = Math.max(1, Math.round((readyMs - firedMs) / 60000));
        const totalCycleMinutes = Math.max(1, Math.round((completedMs - createdMs) / 60000));
        const targetSlaMinutes = t.items.length > 0
            ? Math.max(...t.items.map((i) => Number(i.targetPrepMins || 15)))
            : 15;
        const isDelayed = t.status !== 'Cancelled' && prepDurationMinutes > targetSlaMinutes;
        const stationsInvolved = Array.from(new Set(t.items.map((i) => i.station || 'Main Kitchen')));
        return {
            ...t,
            completedByName: readyEvent?.actorName ||
                lastKdsEvent?.actorName ||
                bohFallback?.fullName ||
                t.placedByName,
            completedByRole: readyEvent?.actorRole ||
                lastKdsEvent?.actorRole ||
                bohFallback?.role ||
                t.placedByRole,
            firedAt: fireEvent?.createdAt || null,
            readyAt: readyEvent?.createdAt || t.completedAt,
            prepDurationMinutes,
            totalCycleMinutes,
            targetSlaMinutes,
            isDelayed,
            stationsInvolved,
            auditTimeline: events.map((ev) => ({
                action: ev.action,
                reason: ev.reason,
                actorName: ev.actorName || t.placedByName,
                actorRole: ev.actorRole || t.placedByRole,
                timestamp: ev.createdAt,
            })),
        };
    });
    if (query.slaStatus === 'ON_TIME') {
        return enriched.filter((t) => !t.isDelayed && t.status !== 'Cancelled');
    }
    if (query.slaStatus === 'DELAYED') {
        return enriched.filter((t) => t.isDelayed);
    }
    return enriched;
};
exports.getKitchenHistoryTickets = getKitchenHistoryTickets;
const getKitchenPerformanceStats = async (tenantId, query = {}) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined,
        query.orderType && query.orderType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.orders.orderType, query.orderType)
            : undefined,
        query.startDate
            ? (0, drizzle_orm_1.gte)(schema_1.orders.createdAt, new Date(`${query.startDate}T00:00:00.000Z`))
            : undefined,
        query.endDate
            ? (0, drizzle_orm_1.lte)(schema_1.orders.createdAt, new Date(`${query.endDate}T23:59:59.999Z`))
            : undefined,
        (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Completed', 'Ready', 'Served', 'Cancelled']),
    ].filter(Boolean);
    const [tenantUsers, flatRows] = await Promise.all([
        db_1.db
            .select({
            id: schema_1.users.id,
            fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
            role: schema_1.users.role,
            defaultBranchId: schema_1.users.defaultBranchId,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.users.id)),
        db_1.db
            .select({
            id: schema_1.orders.id,
            branchId: schema_1.orders.branchId,
            branchName: schema_1.branches.name,
            orderNumber: schema_1.orders.orderNumber,
            orderType: schema_1.orders.orderType,
            tableName: schema_1.orders.tableName,
            status: schema_1.orders.status,
            createdAt: schema_1.orders.createdAt,
            updatedAt: schema_1.orders.updatedAt,
            placedByName: (0, drizzle_orm_1.sql) `COALESCE(
          NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), ''),
          (SELECT NULLIF(TRIM(CONCAT(w.first_name, ' ', w.last_name)), '') FROM users w WHERE w.id = ${schema_1.orders.waiterId})
        )`,
            orderItemId: schema_1.orderItems.id,
            quantity: schema_1.orderItems.quantity,
            menuItemName: schema_1.menuItems.name,
            prepTimeMinutes: schema_1.menuItems.prepTimeMinutes,
            resolvedStation: resolvedItemStationSql,
        })
            .from(schema_1.orders)
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, schema_1.users.id))
            .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)(...conditions))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.updatedAt))
            .limit(1500),
    ]);
    const primaryUser = tenantUsers[0] || null;
    const resolveStaffFallback = (branchId, roles) => {
        return (tenantUsers.find((u) => u.defaultBranchId === branchId && roles.includes(u.role)) ||
            tenantUsers.find((u) => roles.includes(u.role)) ||
            tenantUsers.find((u) => u.defaultBranchId === branchId) ||
            primaryUser);
    };
    // Group flat rows into order records
    const orderMap = new Map();
    for (const row of flatRows) {
        if (!orderMap.has(row.id)) {
            const fohFallback = resolveStaffFallback(row.branchId, [
                'CASHIER',
                'WAITER',
                'MANAGER',
                'ADMIN',
                'SUPER_ADMIN',
            ]);
            orderMap.set(row.id, {
                id: row.id,
                branchId: row.branchId,
                branchName: row.branchName || 'Main Outlet',
                orderNumber: row.orderNumber,
                orderType: row.orderType,
                tableName: row.tableName,
                status: row.status,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
                placedByName: row.placedByName || fohFallback?.fullName || 'Staff Member',
                items: [],
            });
        }
        if (row.orderItemId) {
            orderMap.get(row.id).items.push({
                id: row.orderItemId,
                quantity: Number(row.quantity || 1),
                name: row.menuItemName || 'Menu Item',
                station: row.resolvedStation || 'Main Kitchen',
                targetPrepMins: Number(row.prepTimeMinutes || 15),
            });
        }
    }
    let allOrders = Array.from(orderMap.values());
    if (query.station && query.station !== 'ALL') {
        const stLow = query.station.toLowerCase();
        allOrders = allOrders.filter((o) => o.items.some((i) => (i.station || '').toLowerCase() === stLow));
    }
    const cancelledOrders = allOrders.filter((o) => o.status === 'Cancelled');
    const completedOrders = allOrders.filter((o) => o.status !== 'Cancelled');
    // Batch-load KDS audit logs for accurate prep durations & BOH staff attribution
    const orderIds = completedOrders.slice(0, 300).map((o) => String(o.id));
    const auditEvents = orderIds.length > 0
        ? await db_1.db
            .select({
            entityId: schema_1.auditLogs.entityId,
            action: schema_1.auditLogs.action,
            createdAt: schema_1.auditLogs.createdAt,
            actorName: (0, drizzle_orm_1.sql) `NULLIF(TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName})), '')`,
        })
            .from(schema_1.auditLogs)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.auditLogs.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.auditLogs.entityType, 'orders'), (0, drizzle_orm_1.inArray)(schema_1.auditLogs.entityId, orderIds)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.auditLogs.createdAt))
        : [];
    const auditsByOrder = new Map();
    for (const ev of auditEvents) {
        const list = auditsByOrder.get(ev.entityId) || [];
        list.push(ev);
        auditsByOrder.set(ev.entityId, list);
    }
    let totalPrepMins = 0;
    let totalCycleMins = 0;
    let delayedOrdersCount = 0;
    let totalDishesPlated = 0;
    const durationsList = [];
    // Aggregation Maps
    const stationStatsMap = new Map();
    const channelStatsMap = new Map();
    const staffStatsMap = new Map();
    const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        ticketsCount: 0,
        dishesCount: 0,
        totalPrepMins: 0,
    }));
    const enrichedExecutions = completedOrders.map((order) => {
        const evs = auditsByOrder.get(String(order.id)) || [];
        const fireEv = evs.find((e) => e.action === 'KDS_TICKET_PREPARING');
        const bumpEv = [...evs]
            .reverse()
            .find((e) => [
            'KDS_TICKET_READY',
            'KDS_STATION_ITEMS_BUMPED',
            'KDS_TICKET_COMPLETED',
            'ORDER_STATUS_COMPLETED',
            'ORDER_STATUS_READY',
        ].includes(e.action));
        const createdMs = new Date(order.createdAt).getTime();
        const firedMs = fireEv ? new Date(fireEv.createdAt).getTime() : createdMs;
        const readyMs = bumpEv
            ? new Date(bumpEv.createdAt).getTime()
            : new Date(order.updatedAt).getTime();
        const completedMs = new Date(order.updatedAt).getTime();
        const prepMins = Math.max(1, Math.round((readyMs - firedMs) / 60000));
        const cycleMins = Math.max(1, Math.round((completedMs - createdMs) / 60000));
        const targetSlaMins = order.items.length > 0
            ? Math.max(...order.items.map((i) => i.targetPrepMins || 15))
            : 15;
        const isDelayed = prepMins > targetSlaMins;
        const orderDishes = order.items.reduce((s, i) => s + i.quantity, 0);
        totalPrepMins += prepMins;
        totalCycleMins += cycleMins;
        totalDishesPlated += orderDishes;
        durationsList.push(prepMins);
        if (isDelayed)
            delayedOrdersCount++;
        const bohFallback = resolveStaffFallback(order.branchId, [
            'HEAD_CHEF',
            'CHEF',
            'MANAGER',
            'ADMIN',
            'SUPER_ADMIN',
        ]);
        const completedByName = bumpEv?.actorName || bohFallback?.fullName || order.placedByName;
        // 1. Station Breakdown
        const orderStations = new Set();
        for (const item of order.items) {
            const stName = item.station || 'Main Kitchen';
            orderStations.add(stName);
            const stEntry = stationStatsMap.get(stName) || {
                station: stName,
                ticketsCount: 0,
                dishesCount: 0,
                totalPrepMins: 0,
                onTimeCount: 0,
                delayedCount: 0,
                targetSlaSum: 0,
            };
            stEntry.dishesCount += item.quantity;
            stEntry.targetSlaSum += item.targetPrepMins * item.quantity;
            stationStatsMap.set(stName, stEntry);
        }
        for (const stName of orderStations) {
            const stEntry = stationStatsMap.get(stName);
            stEntry.ticketsCount += 1;
            stEntry.totalPrepMins += prepMins;
            if (isDelayed)
                stEntry.delayedCount += 1;
            else
                stEntry.onTimeCount += 1;
        }
        // 2. Channel Breakdown
        const chName = order.orderType || 'Dine-In';
        const chEntry = channelStatsMap.get(chName) || {
            channel: chName,
            ticketsCount: 0,
            totalPrepMins: 0,
            onTimeCount: 0,
        };
        chEntry.ticketsCount += 1;
        chEntry.totalPrepMins += prepMins;
        if (!isDelayed)
            chEntry.onTimeCount += 1;
        channelStatsMap.set(chName, chEntry);
        // 3. Staff Execution Attribution
        const staffEntry = staffStatsMap.get(completedByName) || {
            staffName: completedByName,
            ticketsCompleted: 0,
            dishesPrepared: 0,
            totalPrepMins: 0,
            onTimeCount: 0,
        };
        staffEntry.ticketsCompleted += 1;
        staffEntry.dishesPrepared += orderDishes;
        staffEntry.totalPrepMins += prepMins;
        if (!isDelayed)
            staffEntry.onTimeCount += 1;
        staffStatsMap.set(completedByName, staffEntry);
        // 4. Hourly Rush Bucket
        const hourIdx = new Date(order.createdAt).getHours();
        if (hourlyBuckets[hourIdx]) {
            hourlyBuckets[hourIdx].ticketsCount += 1;
            hourlyBuckets[hourIdx].dishesCount += orderDishes;
            hourlyBuckets[hourIdx].totalPrepMins += prepMins;
        }
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            branchName: order.branchName,
            orderType: order.orderType,
            tableName: order.tableName,
            status: order.status,
            placedByName: order.placedByName,
            completedByName,
            stations: Array.from(orderStations),
            dishesCount: orderDishes,
            durationMins: prepMins,
            cycleMins,
            targetSlaMins,
            isDelayed,
            updatedAt: order.updatedAt,
        };
    });
    const totalProcessed = completedOrders.length;
    const avgPrepTimeMinutes = totalProcessed > 0 ? Math.round(totalPrepMins / totalProcessed) : 0;
    const avgCycleTimeMinutes = totalProcessed > 0 ? Math.round(totalCycleMins / totalProcessed) : 0;
    durationsList.sort((a, b) => a - b);
    const medianPrepTimeMinutes = durationsList.length > 0
        ? durationsList[Math.floor(durationsList.length / 2)]
        : 0;
    const onTimeRatePercentage = totalProcessed > 0
        ? Math.round(((totalProcessed - delayedOrdersCount) / totalProcessed) * 100)
        : 100;
    const stationBreakdown = Array.from(stationStatsMap.values())
        .map((s) => ({
        station: s.station,
        ticketsCount: s.ticketsCount,
        dishesCount: s.dishesCount,
        avgPrepMins: s.ticketsCount > 0 ? Math.round(s.totalPrepMins / s.ticketsCount) : 0,
        targetSlaMins: s.dishesCount > 0 ? Math.round(s.targetSlaSum / s.dishesCount) : 15,
        onTimeRatePct: s.ticketsCount > 0 ? Math.round((s.onTimeCount / s.ticketsCount) * 100) : 100,
        delayedCount: s.delayedCount,
    }))
        .sort((a, b) => b.dishesCount - a.dishesCount);
    const channelBreakdown = Array.from(channelStatsMap.values())
        .map((c) => ({
        channel: c.channel,
        ticketsCount: c.ticketsCount,
        avgPrepMins: c.ticketsCount > 0 ? Math.round(c.totalPrepMins / c.ticketsCount) : 0,
        onTimeRatePct: c.ticketsCount > 0 ? Math.round((c.onTimeCount / c.ticketsCount) * 100) : 100,
    }))
        .sort((a, b) => b.ticketsCount - a.ticketsCount);
    const staffLeaderboard = Array.from(staffStatsMap.values())
        .map((st) => ({
        staffName: st.staffName,
        ticketsCompleted: st.ticketsCompleted,
        dishesPrepared: st.dishesPrepared,
        avgPrepMins: st.ticketsCompleted > 0 ? Math.round(st.totalPrepMins / st.ticketsCompleted) : 0,
        onTimeRatePct: st.ticketsCompleted > 0
            ? Math.round((st.onTimeCount / st.ticketsCompleted) * 100)
            : 100,
    }))
        .sort((a, b) => b.ticketsCompleted - a.ticketsCompleted);
    const activeHourlyRush = hourlyBuckets
        .filter((h) => h.ticketsCount > 0)
        .map((h) => ({
        hour: h.hour,
        label: h.label,
        ticketsCount: h.ticketsCount,
        dishesCount: h.dishesCount,
        avgPrepMins: h.ticketsCount > 0 ? Math.round(h.totalPrepMins / h.ticketsCount) : 0,
    }));
    return {
        summary: {
            totalProcessed,
            totalDishesPlated,
            cancelledTickets: cancelledOrders.length,
            avgPrepTimeMinutes,
            medianPrepTimeMinutes,
            avgCycleTimeMinutes,
            onTimeRatePercentage,
            delayedOrders: delayedOrdersCount,
        },
        stationBreakdown,
        channelBreakdown,
        staffLeaderboard,
        hourlyRush: activeHourlyRush,
        recentExecutions: enrichedExecutions.slice(0, 25),
    };
};
exports.getKitchenPerformanceStats = getKitchenPerformanceStats;
const getStationWorkloadSummary = async (tenantId, branchId) => {
    const rows = await db_1.db
        .select({
        station: resolvedItemStationSql,
        pendingItemsCount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN COALESCE(${schema_1.orderItems.kitchenStatus}, 'New') != 'Ready' THEN CAST(${schema_1.orderItems.quantity} AS NUMERIC) ELSE 0 END), 0)::int`,
        readyItemsCount: (0, drizzle_orm_1.sql) `COALESCE(SUM(CASE WHEN ${schema_1.orderItems.kitchenStatus} = 'Ready' THEN CAST(${schema_1.orderItems.quantity} AS NUMERIC) ELSE 0 END), 0)::int`,
        activeTicketsCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT CASE WHEN COALESCE(${schema_1.orderItems.kitchenStatus}, 'New') != 'Ready' THEN ${schema_1.orders.id} END)::int`,
    })
        .from(schema_1.orderItems)
        .innerJoin(schema_1.orders, (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, schema_1.orders.id))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined, (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing'])))
        .groupBy(resolvedItemStationSql)
        .orderBy((0, drizzle_orm_1.asc)(resolvedItemStationSql));
    return rows.map((r) => ({
        station: r.station,
        pendingItemsCount: Number(r.pendingItemsCount || 0),
        readyItemsCount: Number(r.readyItemsCount || 0),
        activeTicketsCount: Number(r.activeTicketsCount || 0),
    }));
};
exports.getStationWorkloadSummary = getStationWorkloadSummary;
const bumpStationItemsOnOrder = async (tenantId, userId, orderId, station) => {
    return await db_1.db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .limit(1);
        if (!order) {
            throw new Error('Kitchen order ticket not found');
        }
        const lines = await tx
            .select({
            id: schema_1.orderItems.id,
            kitchenStatus: schema_1.orderItems.kitchenStatus,
            station: resolvedItemStationSql,
        })
            .from(schema_1.orderItems)
            .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)));
        const targetIds = lines
            .filter((l) => station === 'ALL' || l.station === station)
            .map((l) => l.id);
        if (targetIds.length === 0) {
            throw new Error(`No line items found for station "${station}" on order ${order.orderNumber}`);
        }
        await tx
            .update(schema_1.orderItems)
            .set({ kitchenStatus: 'Ready' })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orderItems.id, targetIds)));
        const targetIdSet = new Set(targetIds);
        const allItemsReady = lines.every((l) => targetIdSet.has(l.id) || l.kitchenStatus === 'Ready');
        const nextOrderStatus = allItemsReady
            ? 'Ready'
            : order.status === 'Confirmed' || order.status === 'Sent-To-Kitchen'
                ? 'Preparing'
                : order.status;
        if (nextOrderStatus !== order.status) {
            await tx
                .update(schema_1.orders)
                .set({ status: nextOrderStatus, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId));
        }
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: order.branchId ?? null,
            userId,
            action: 'KDS_STATION_ITEMS_BUMPED',
            module: 'KITCHEN',
            entityType: 'orders',
            entityId: String(orderId),
            reason: `Station "${station}" bumped ${targetIds.length} item(s) on ${order.orderNumber} (Order status: ${nextOrderStatus})`,
            newValues: {
                station,
                bumpedItemIds: targetIds,
                allItemsReady,
                nextOrderStatus,
            },
        });
        return {
            orderId,
            orderNumber: order.orderNumber,
            station,
            bumpedCount: targetIds.length,
            allItemsReady,
            nextOrderStatus,
        };
    });
};
exports.bumpStationItemsOnOrder = bumpStationItemsOnOrder;
// ============================================================================
// STATION MASTER DATA, SLA THRESHOLDS & ROUTING CONFIGURATION (ZERO AUTO-SEED)
// ============================================================================
const listConfiguredKitchenStations = async (tenantId, branchId) => {
    const rows = await db_1.db
        .select({
        id: schema_1.kitchenStations.id,
        tenantId: schema_1.kitchenStations.tenantId,
        branchId: schema_1.kitchenStations.branchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
        name: schema_1.kitchenStations.name,
        code: schema_1.kitchenStations.code,
        stationType: schema_1.kitchenStations.stationType,
        colorHex: schema_1.kitchenStations.colorHex,
        targetPrepTimeMinutes: schema_1.kitchenStations.targetPrepTimeMinutes,
        warningTimeMinutes: schema_1.kitchenStations.warningTimeMinutes,
        criticalTimeMinutes: schema_1.kitchenStations.criticalTimeMinutes,
        assignedCategories: schema_1.kitchenStations.assignedCategories,
        autoBumpOnPrint: schema_1.kitchenStations.autoBumpOnPrint,
        soundAlertOnNewTicket: schema_1.kitchenStations.soundAlertOnNewTicket,
        allowTicketRecall: schema_1.kitchenStations.allowTicketRecall,
        backupStationId: schema_1.kitchenStations.backupStationId,
        backupStationName: (0, drizzle_orm_1.sql) `(SELECT bs.name FROM kitchen_stations bs WHERE bs.id = ${schema_1.kitchenStations.backupStationId})`,
        isActive: schema_1.kitchenStations.isActive,
        mappedMenuItemsCount: (0, drizzle_orm_1.sql) `(
        SELECT COUNT(DISTINCT mi.id)::int
        FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.tenant_id = ${tenantId}
          AND mi.is_available = true
          AND (
            LOWER(TRIM(COALESCE(mi.kitchen_station, ''))) = LOWER(TRIM(${schema_1.kitchenStations.name}))
            OR LOWER(TRIM(COALESCE(mi.kitchen_station, ''))) = LOWER(TRIM(${schema_1.kitchenStations.code}))
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(${schema_1.kitchenStations.assignedCategories}) AS cat
              WHERE LOWER(TRIM(cat)) = 'all'
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mc.name, '')))
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mi.kitchen_station, '')))
            )
            OR (
              ${schema_1.kitchenStations.stationType} = 'BAR'
              AND (
                LOWER(COALESCE(mi.kitchen_station, '')) LIKE '%bar%'
                OR LOWER(COALESCE(mi.kitchen_station, '')) LIKE '%beverage%'
              )
            )
          )
      )`,
        activeDishesCount: (0, drizzle_orm_1.sql) `(
        SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE o.tenant_id = ${tenantId}
          AND o.status IN ('Confirmed', 'Sent-To-Kitchen', 'Preparing')
          AND COALESCE(oi.kitchen_status, 'New') != 'Ready'
          AND (
            o.branch_id IS NULL
            OR o.branch_id = ${schema_1.kitchenStations.branchId}
            OR NOT EXISTS (
              SELECT 1 FROM kitchen_stations ks_b
              WHERE ks_b.tenant_id = ${tenantId}
                AND ks_b.branch_id = o.branch_id
                AND ks_b.is_active = true
            )
          )
          AND (
            LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${schema_1.kitchenStations.name}))
            OR LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${schema_1.kitchenStations.code}))
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(${schema_1.kitchenStations.assignedCategories}) AS cat
              WHERE LOWER(TRIM(cat)) = 'all'
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mc.name, '')))
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen')))
            )
            OR (
              ${schema_1.kitchenStations.stationType} = 'BAR'
              AND (
                LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%bar%'
                OR LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%beverage%'
              )
            )
          )
      )`,
        activeTicketsCount: (0, drizzle_orm_1.sql) `(
        SELECT COUNT(DISTINCT o.id)::int
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE o.tenant_id = ${tenantId}
          AND o.status IN ('Confirmed', 'Sent-To-Kitchen', 'Preparing')
          AND COALESCE(oi.kitchen_status, 'New') != 'Ready'
          AND (
            o.branch_id IS NULL
            OR o.branch_id = ${schema_1.kitchenStations.branchId}
            OR NOT EXISTS (
              SELECT 1 FROM kitchen_stations ks_b
              WHERE ks_b.tenant_id = ${tenantId}
                AND ks_b.branch_id = o.branch_id
                AND ks_b.is_active = true
            )
          )
          AND (
            LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${schema_1.kitchenStations.name}))
            OR LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${schema_1.kitchenStations.code}))
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(${schema_1.kitchenStations.assignedCategories}) AS cat
              WHERE LOWER(TRIM(cat)) = 'all'
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mc.name, '')))
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen')))
            )
            OR (
              ${schema_1.kitchenStations.stationType} = 'BAR'
              AND (
                LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%bar%'
                OR LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%beverage%'
              )
            )
          )
      )`,
        createdAt: schema_1.kitchenStations.createdAt,
        updatedAt: schema_1.kitchenStations.updatedAt,
    })
        .from(schema_1.kitchenStations)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.kitchenStations.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.kitchenStations.branchId, branchId) : undefined))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.kitchenStations.branchId), (0, drizzle_orm_1.asc)(schema_1.kitchenStations.name));
    return rows;
};
exports.listConfiguredKitchenStations = listConfiguredKitchenStations;
const getKitchenGlobalSettingsRecord = async (tenantId) => {
    const [settings] = await db_1.db
        .select()
        .from(schema_1.kitchenGlobalSettings)
        .where((0, drizzle_orm_1.eq)(schema_1.kitchenGlobalSettings.tenantId, tenantId))
        .limit(1);
    return settings || null;
};
exports.getKitchenGlobalSettingsRecord = getKitchenGlobalSettingsRecord;
const listTenantMenuCategoriesForRouting = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.menuCategories.id,
        name: schema_1.menuCategories.name,
    })
        .from(schema_1.menuCategories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuCategories.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.menuCategories.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.menuCategories.sortOrder), (0, drizzle_orm_1.asc)(schema_1.menuCategories.name));
};
exports.listTenantMenuCategoriesForRouting = listTenantMenuCategoriesForRouting;
const createKitchenStationRecord = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [branch] = await tx
            .select({ id: schema_1.branches.id })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, input.branchId), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .limit(1);
        if (!branch) {
            throw new Error('Selected branch outlet does not belong to this workspace');
        }
        const [created] = await tx
            .insert(schema_1.kitchenStations)
            .values({
            tenantId,
            branchId: input.branchId,
            name: input.name,
            code: input.code,
            stationType: input.stationType,
            colorHex: input.colorHex,
            targetPrepTimeMinutes: input.targetPrepTimeMinutes,
            warningTimeMinutes: input.warningTimeMinutes,
            criticalTimeMinutes: input.criticalTimeMinutes,
            assignedCategories: input.assignedCategories,
            autoBumpOnPrint: input.autoBumpOnPrint,
            soundAlertOnNewTicket: input.soundAlertOnNewTicket,
            allowTicketRecall: input.allowTicketRecall,
            backupStationId: input.backupStationId ?? null,
            isActive: input.isActive,
        })
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: input.branchId,
            userId,
            action: 'KITCHEN_STATION_CREATED',
            module: 'KITCHEN',
            entityType: 'kitchen_stations',
            entityId: String(created.id),
            reason: `Registered prep station "${created.name}" (${created.code})`,
            newValues: created,
        });
        return created;
    });
};
exports.createKitchenStationRecord = createKitchenStationRecord;
const updateKitchenStationRecord = async (tenantId, userId, stationId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.kitchenStations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId), (0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            throw new Error('Kitchen station not found');
        }
        const [updated] = await tx
            .update(schema_1.kitchenStations)
            .set({
            ...input,
            backupStationId: input.backupStationId !== undefined
                ? input.backupStationId
                : existing.backupStationId,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: updated.branchId,
            userId,
            action: 'KITCHEN_STATION_UPDATED',
            module: 'KITCHEN',
            entityType: 'kitchen_stations',
            entityId: String(stationId),
            reason: `Updated station "${updated.name}" (${updated.code})`,
            previousValues: existing,
            newValues: updated,
        });
        return updated;
    });
};
exports.updateKitchenStationRecord = updateKitchenStationRecord;
const deleteKitchenStationRecord = async (tenantId, userId, stationId) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.kitchenStations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId), (0, drizzle_orm_1.eq)(schema_1.kitchenStations.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            throw new Error('Kitchen station not found');
        }
        await tx.delete(schema_1.kitchenStations).where((0, drizzle_orm_1.eq)(schema_1.kitchenStations.id, stationId));
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            branchId: existing.branchId,
            userId,
            action: 'KITCHEN_STATION_DELETED',
            module: 'KITCHEN',
            entityType: 'kitchen_stations',
            entityId: String(stationId),
            reason: `Removed station "${existing.name}" (${existing.code})`,
            previousValues: existing,
        });
        return existing;
    });
};
exports.deleteKitchenStationRecord = deleteKitchenStationRecord;
const upsertKitchenGlobalSettingsRecord = async (tenantId, userId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(schema_1.kitchenGlobalSettings)
            .where((0, drizzle_orm_1.eq)(schema_1.kitchenGlobalSettings.tenantId, tenantId))
            .limit(1);
        let saved;
        if (!existing) {
            const [created] = await tx
                .insert(schema_1.kitchenGlobalSettings)
                .values({
                tenantId,
                ...input,
            })
                .returning();
            saved = created;
        }
        else {
            const [updated] = await tx
                .update(schema_1.kitchenGlobalSettings)
                .set({
                ...input,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.kitchenGlobalSettings.tenantId, tenantId))
                .returning();
            saved = updated;
        }
        await tx.insert(schema_1.auditLogs).values({
            tenantId,
            userId,
            action: 'KITCHEN_GLOBAL_SETTINGS_UPDATED',
            module: 'KITCHEN',
            entityType: 'kitchen_global_settings',
            entityId: String(saved.id),
            reason: 'Updated global KDS pacing, consolidation, and SLA thresholds',
            newValues: saved,
        });
        return saved;
    });
};
exports.upsertKitchenGlobalSettingsRecord = upsertKitchenGlobalSettingsRecord;
