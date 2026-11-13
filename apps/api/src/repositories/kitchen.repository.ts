// apps/api/src/repositories/kitchen.repository.ts
import { eq, and, inArray, desc, asc, sql, isNotNull, gte, lte } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  menuCategories,
  branches,
  users,
  auditLogs,
  kitchenStations,
  kitchenGlobalSettings,
} from '../config/schema';
import {
  KitchenTicketsQuery,
  KitchenHistoryQuery,
  CreateKitchenStationInput,
  UpdateKitchenStationInput,
  UpdateKitchenGlobalSettingsInput,
} from '../validators/kitchen.validator';

// ============================================================================
// SHARED SQL EXPRESSIONS FOR LINE-LEVEL STATION ROUTING & CLEAN NOTES
// ============================================================================

const resolvedItemStationSql = sql<string>`COALESCE(
  NULLIF(SUBSTRING(${orderItems.notes} FROM '\\[STATION:([^\\]]+)\\]'), ''),
  NULLIF(TRIM(${menuItems.kitchenStation}), ''),
  'Main Kitchen'
)`;

const cleanItemNotesSql = sql<string | null>`NULLIF(
  TRIM(REGEXP_REPLACE(COALESCE(${orderItems.notes}, ''), '\\[STATION:[^\\]]+\\]\\s*', '')),
  ''
)`;

// ============================================================================
// ACTIVE KDS TICKETS, WORKLOAD TELEMETRY & STATION BUMP OPERATIONS
// ============================================================================

export const getDistinctTenantKitchenStations = async (tenantId: number) => {
  const [menuRows, configuredRows, activeRoutedRows] = await Promise.all([
    db
      .selectDistinct({
        station: menuItems.kitchenStation,
      })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.tenantId, tenantId),
          isNotNull(menuItems.kitchenStation),
          sql`TRIM(${menuItems.kitchenStation}) != ''`
        )
      ),
    db
      .select({
        name: kitchenStations.name,
      })
      .from(kitchenStations)
      .where(
        and(
          eq(kitchenStations.tenantId, tenantId),
          eq(kitchenStations.isActive, true)
        )
      ),
    db
      .selectDistinct({
        station: resolvedItemStationSql,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          inArray(orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing'])
        )
      ),
  ]);

  const stationSet = new Set<string>();
  menuRows.forEach((r) => {
    if (r.station) stationSet.add(r.station.trim());
  });
  configuredRows.forEach((r) => {
    if (r.name) stationSet.add(r.name.trim());
  });
  activeRoutedRows.forEach((r) => {
    if (r.station) stationSet.add(r.station.trim());
  });

  return Array.from(stationSet).sort();
};

export const getActiveKitchenTickets = async (
  tenantId: number,
  query: KitchenTicketsQuery = {}
) => {
  const conditions = [
    eq(orders.tenantId, tenantId),
    inArray(orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing']),
    query.branchId ? eq(orders.branchId, query.branchId) : undefined,
    query.orderType && query.orderType !== 'ALL'
      ? eq(orders.orderType, query.orderType)
      : undefined,
    query.station && query.station !== 'ALL'
      ? sql`(
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
                     OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(${menuCategories.name}, '')))
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

  const flatTickets = await db
    .select({
      id: orders.id,
      branchId: orders.branchId,
      branchName: branches.name,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      tableName: orders.tableName,
      customerName: orders.customerName,
      orderNotes: orders.notes,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      createdAt: orders.createdAt,
      orderItemId: orderItems.id,
      quantity: orderItems.quantity,
      kitchenStatus: orderItems.kitchenStatus,
      itemNotes: cleanItemNotesSql,
      selectedModifiers: orderItems.selectedModifiers,
      menuItemName: menuItems.name,
      resolvedStation: resolvedItemStationSql,
      prepTimeMinutes: menuItems.prepTimeMinutes,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(and(...conditions));

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
  }, {} as Record<number, any>);

  // FIFO chronological queue (oldest tickets first)
  return Object.values(grouped).sort(
    (a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export const updateTicketStatus = async (
  tenantId: number,
  userId: number | null,
  orderId: number,
  status: string
) => {
  return await db.transaction(async (tx) => {
    const [updatedOrder] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();

    if (!updatedOrder) {
      throw new Error('Kitchen ticket not found');
    }

    if (status === 'Preparing' || status === 'Ready') {
      await tx
        .update(orderItems)
        .set({ kitchenStatus: status })
        .where(
          and(
            eq(orderItems.tenantId, tenantId),
            eq(orderItems.orderId, orderId)
          )
        );
    }

    await tx.insert(auditLogs).values({
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

export const updateLineItemKitchenStatus = async (
  tenantId: number,
  orderItemId: number,
  kitchenStatus: 'New' | 'Preparing' | 'Ready'
) => {
  const [updated] = await db
    .update(orderItems)
    .set({ kitchenStatus })
    .where(and(eq(orderItems.id, orderItemId), eq(orderItems.tenantId, tenantId)))
    .returning();

  if (!updated) {
    throw new Error('Order line item not found');
  }

  return updated;
};

export const getKitchenHistoryTickets = async (
  tenantId: number,
  query: Partial<KitchenHistoryQuery> = {}
) => {
  const statusList =
    query.status && query.status !== 'ALL'
      ? [query.status]
      : ['Completed', 'Ready', 'Cancelled', 'Served'];

  const conditions = [
    eq(orders.tenantId, tenantId),
    inArray(orders.status, statusList),
    query.branchId ? eq(orders.branchId, query.branchId) : undefined,
    query.orderType && query.orderType !== 'ALL'
      ? eq(orders.orderType, query.orderType)
      : undefined,
    query.startDate
      ? gte(orders.createdAt, new Date(`${query.startDate}T00:00:00.000Z`))
      : undefined,
    query.endDate
      ? lte(orders.createdAt, new Date(`${query.endDate}T23:59:59.999Z`))
      : undefined,
  ].filter(Boolean);

  // Fetch active tenant users from DB to resolve real full names (never synthetic labels)
  const [tenantUsers, flatTickets] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.id)),

    db
      .select({
        id: orders.id,
        branchId: orders.branchId,
        branchName: branches.name,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        tableName: orders.tableName,
        customerName: orders.customerName,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        placedByName: sql<string | null>`COALESCE(
          NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), ''),
          (SELECT NULLIF(TRIM(CONCAT(w.first_name, ' ', w.last_name)), '') FROM users w WHERE w.id = ${orders.waiterId}),
          (SELECT NULLIF(TRIM(CONCAT(pu.first_name, ' ', pu.last_name)), '') FROM payments p JOIN users pu ON p.processed_by_id = pu.id WHERE p.order_id = ${orders.id} ORDER BY p.id DESC LIMIT 1)
        )`,
        placedByRole: sql<string | null>`COALESCE(
          ${users.role},
          (SELECT w.role FROM users w WHERE w.id = ${orders.waiterId}),
          (SELECT pu.role FROM payments p JOIN users pu ON p.processed_by_id = pu.id WHERE p.order_id = ${orders.id} ORDER BY p.id DESC LIMIT 1)
        )`,
        orderItemId: orderItems.id,
        quantity: orderItems.quantity,
        menuItemName: menuItems.name,
        prepTimeMinutes: menuItems.prepTimeMinutes,
        resolvedStation: resolvedItemStationSql,
        itemNotes: cleanItemNotesSql,
      })
      .from(orders)
      .leftJoin(branches, eq(orders.branchId, branches.id))
      .leftJoin(users, eq(orders.cashierId, users.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(...conditions))
      .orderBy(desc(orders.updatedAt))
      .limit((query.limit || 150) * 5),
  ]);

  const primaryTenantUser = tenantUsers[0] || null;
  const resolveBranchStaffFallback = (branchId: number | null, preferredRoles: string[]) => {
    const byBranchAndRole = tenantUsers.find(
      (u) => u.defaultBranchId === branchId && preferredRoles.includes(u.role)
    );
    if (byBranchAndRole) return byBranchAndRole;

    const byRole = tenantUsers.find((u) => preferredRoles.includes(u.role));
    if (byRole) return byRole;

    const byBranch = tenantUsers.find((u) => u.defaultBranchId === branchId);
    if (byBranch) return byBranch;

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
  }, {} as Record<number, any>);

  let tickets = Object.values(groupedMap);

  if (query.station && query.station !== 'ALL') {
    const stLower = query.station.toLowerCase();
    tickets = tickets.filter((t: any) =>
      t.items.some((i: any) => (i.station || '').toLowerCase() === stLower)
    );
  }

  if (query.search && query.search.trim()) {
    const q = query.search.trim().toLowerCase();
    tickets = tickets.filter(
      (t: any) =>
        t.orderNumber.toLowerCase().includes(q) ||
        (t.tableName && t.tableName.toLowerCase().includes(q)) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.placedByName && t.placedByName.toLowerCase().includes(q)) ||
        t.items.some((i: any) => i.name.toLowerCase().includes(q))
    );
  }

  tickets = tickets.slice(0, query.limit || 150);

  if (tickets.length === 0) return [];

  // Batch-fetch KDS & Order audit trail events for staff execution attribution
  const orderIds = tickets.map((t: any) => String(t.id));
  const auditEvents = await db
    .select({
      entityId: auditLogs.entityId,
      module: auditLogs.module,
      action: auditLogs.action,
      reason: auditLogs.reason,
      createdAt: auditLogs.createdAt,
      actorName: sql<string | null>`NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), '')`,
      actorRole: users.role,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(
      and(
        eq(auditLogs.tenantId, tenantId),
        eq(auditLogs.entityType, 'orders'),
        inArray(auditLogs.entityId, orderIds)
      )
    )
    .orderBy(asc(auditLogs.createdAt));

  const auditsByOrderId = new Map<string, typeof auditEvents>();
  for (const ev of auditEvents) {
    const arr = auditsByOrderId.get(ev.entityId) || [];
    arr.push(ev);
    auditsByOrderId.set(ev.entityId, arr);
  }

  const enriched = tickets.map((t: any) => {
    const events = auditsByOrderId.get(String(t.id)) || [];

    const fireEvent = events.find((e) => e.action === 'KDS_TICKET_PREPARING');
    const readyEvent = [...events]
      .reverse()
      .find(
        (e) =>
          e.action === 'KDS_TICKET_READY' ||
          e.action === 'KDS_STATION_ITEMS_BUMPED' ||
          e.action === 'KDS_TICKET_COMPLETED' ||
          e.action === 'ORDER_STATUS_COMPLETED' ||
          e.action === 'ORDER_STATUS_READY'
      );
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

    const targetSlaMinutes =
      t.items.length > 0
        ? Math.max(...t.items.map((i: any) => Number(i.targetPrepMins || 15)))
        : 15;

    const isDelayed =
      t.status !== 'Cancelled' && prepDurationMinutes > targetSlaMinutes;

    const stationsInvolved = Array.from(
      new Set(t.items.map((i: any) => i.station || 'Main Kitchen'))
    );

    return {
      ...t,
      completedByName:
        readyEvent?.actorName ||
        lastKdsEvent?.actorName ||
        bohFallback?.fullName ||
        t.placedByName,
      completedByRole:
        readyEvent?.actorRole ||
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
    return enriched.filter((t: any) => !t.isDelayed && t.status !== 'Cancelled');
  }
  if (query.slaStatus === 'DELAYED') {
    return enriched.filter((t: any) => t.isDelayed);
  }

  return enriched;
};

export const getKitchenPerformanceStats = async (
  tenantId: number,
  query: {
    branchId?: number;
    station?: string;
    orderType?: string;
    startDate?: string;
    endDate?: string;
  } = {}
) => {
  const conditions = [
    eq(orders.tenantId, tenantId),
    query.branchId ? eq(orders.branchId, query.branchId) : undefined,
    query.orderType && query.orderType !== 'ALL'
      ? eq(orders.orderType, query.orderType)
      : undefined,
    query.startDate
      ? gte(orders.createdAt, new Date(`${query.startDate}T00:00:00.000Z`))
      : undefined,
    query.endDate
      ? lte(orders.createdAt, new Date(`${query.endDate}T23:59:59.999Z`))
      : undefined,
    inArray(orders.status, ['Completed', 'Ready', 'Served', 'Cancelled']),
  ].filter(Boolean);

  const [tenantUsers, flatRows] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
        role: users.role,
        defaultBranchId: users.defaultBranchId,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.id)),

    db
      .select({
        id: orders.id,
        branchId: orders.branchId,
        branchName: branches.name,
        orderNumber: orders.orderNumber,
        orderType: orders.orderType,
        tableName: orders.tableName,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        placedByName: sql<string | null>`COALESCE(
          NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), ''),
          (SELECT NULLIF(TRIM(CONCAT(w.first_name, ' ', w.last_name)), '') FROM users w WHERE w.id = ${orders.waiterId})
        )`,
        orderItemId: orderItems.id,
        quantity: orderItems.quantity,
        menuItemName: menuItems.name,
        prepTimeMinutes: menuItems.prepTimeMinutes,
        resolvedStation: resolvedItemStationSql,
      })
      .from(orders)
      .leftJoin(branches, eq(orders.branchId, branches.id))
      .leftJoin(users, eq(orders.cashierId, users.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(...conditions))
      .orderBy(desc(orders.updatedAt))
      .limit(1500),
  ]);

  const primaryUser = tenantUsers[0] || null;
  const resolveStaffFallback = (branchId: number | null, roles: string[]) => {
    return (
      tenantUsers.find((u) => u.defaultBranchId === branchId && roles.includes(u.role)) ||
      tenantUsers.find((u) => roles.includes(u.role)) ||
      tenantUsers.find((u) => u.defaultBranchId === branchId) ||
      primaryUser
    );
  };

  // Group flat rows into order records
  const orderMap = new Map<number, any>();
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
    allOrders = allOrders.filter((o) =>
      o.items.some((i: any) => (i.station || '').toLowerCase() === stLow)
    );
  }

  const cancelledOrders = allOrders.filter((o) => o.status === 'Cancelled');
  const completedOrders = allOrders.filter((o) => o.status !== 'Cancelled');

  // Batch-load KDS audit logs for accurate prep durations & BOH staff attribution
  const orderIds = completedOrders.slice(0, 300).map((o) => String(o.id));
  const auditEvents =
    orderIds.length > 0
      ? await db
          .select({
            entityId: auditLogs.entityId,
            action: auditLogs.action,
            createdAt: auditLogs.createdAt,
            actorName: sql<string | null>`NULLIF(TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName})), '')`,
          })
          .from(auditLogs)
          .leftJoin(users, eq(auditLogs.userId, users.id))
          .where(
            and(
              eq(auditLogs.tenantId, tenantId),
              eq(auditLogs.entityType, 'orders'),
              inArray(auditLogs.entityId, orderIds)
            )
          )
          .orderBy(asc(auditLogs.createdAt))
      : [];

  const auditsByOrder = new Map<string, typeof auditEvents>();
  for (const ev of auditEvents) {
    const list = auditsByOrder.get(ev.entityId) || [];
    list.push(ev);
    auditsByOrder.set(ev.entityId, list);
  }

  let totalPrepMins = 0;
  let totalCycleMins = 0;
  let delayedOrdersCount = 0;
  let totalDishesPlated = 0;
  const durationsList: number[] = [];

  // Aggregation Maps
  const stationStatsMap = new Map<
    string,
    {
      station: string;
      ticketsCount: number;
      dishesCount: number;
      totalPrepMins: number;
      onTimeCount: number;
      delayedCount: number;
      targetSlaSum: number;
    }
  >();

  const channelStatsMap = new Map<
    string,
    {
      channel: string;
      ticketsCount: number;
      totalPrepMins: number;
      onTimeCount: number;
    }
  >();

  const staffStatsMap = new Map<
    string,
    {
      staffName: string;
      ticketsCompleted: number;
      dishesPrepared: number;
      totalPrepMins: number;
      onTimeCount: number;
    }
  >();

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
      .find((e) =>
        [
          'KDS_TICKET_READY',
          'KDS_STATION_ITEMS_BUMPED',
          'KDS_TICKET_COMPLETED',
          'ORDER_STATUS_COMPLETED',
          'ORDER_STATUS_READY',
        ].includes(e.action)
      );

    const createdMs = new Date(order.createdAt).getTime();
    const firedMs = fireEv ? new Date(fireEv.createdAt).getTime() : createdMs;
    const readyMs = bumpEv
      ? new Date(bumpEv.createdAt).getTime()
      : new Date(order.updatedAt).getTime();
    const completedMs = new Date(order.updatedAt).getTime();

    const prepMins = Math.max(1, Math.round((readyMs - firedMs) / 60000));
    const cycleMins = Math.max(1, Math.round((completedMs - createdMs) / 60000));

    const targetSlaMins =
      order.items.length > 0
        ? Math.max(...order.items.map((i: any) => i.targetPrepMins || 15))
        : 15;

    const isDelayed = prepMins > targetSlaMins;
    const orderDishes = order.items.reduce((s: number, i: any) => s + i.quantity, 0);

    totalPrepMins += prepMins;
    totalCycleMins += cycleMins;
    totalDishesPlated += orderDishes;
    durationsList.push(prepMins);
    if (isDelayed) delayedOrdersCount++;

    const bohFallback = resolveStaffFallback(order.branchId, [
      'HEAD_CHEF',
      'CHEF',
      'MANAGER',
      'ADMIN',
      'SUPER_ADMIN',
    ]);
    const completedByName =
      bumpEv?.actorName || bohFallback?.fullName || order.placedByName;

    // 1. Station Breakdown
    const orderStations = new Set<string>();
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
      const stEntry = stationStatsMap.get(stName)!;
      stEntry.ticketsCount += 1;
      stEntry.totalPrepMins += prepMins;
      if (isDelayed) stEntry.delayedCount += 1;
      else stEntry.onTimeCount += 1;
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
    if (!isDelayed) chEntry.onTimeCount += 1;
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
    if (!isDelayed) staffEntry.onTimeCount += 1;
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
  const avgPrepTimeMinutes =
    totalProcessed > 0 ? Math.round(totalPrepMins / totalProcessed) : 0;
  const avgCycleTimeMinutes =
    totalProcessed > 0 ? Math.round(totalCycleMins / totalProcessed) : 0;

  durationsList.sort((a, b) => a - b);
  const medianPrepTimeMinutes =
    durationsList.length > 0
      ? durationsList[Math.floor(durationsList.length / 2)]
      : 0;

  const onTimeRatePercentage =
    totalProcessed > 0
      ? Math.round(((totalProcessed - delayedOrdersCount) / totalProcessed) * 100)
      : 100;

  const stationBreakdown = Array.from(stationStatsMap.values())
    .map((s) => ({
      station: s.station,
      ticketsCount: s.ticketsCount,
      dishesCount: s.dishesCount,
      avgPrepMins: s.ticketsCount > 0 ? Math.round(s.totalPrepMins / s.ticketsCount) : 0,
      targetSlaMins: s.dishesCount > 0 ? Math.round(s.targetSlaSum / s.dishesCount) : 15,
      onTimeRatePct:
        s.ticketsCount > 0 ? Math.round((s.onTimeCount / s.ticketsCount) * 100) : 100,
      delayedCount: s.delayedCount,
    }))
    .sort((a, b) => b.dishesCount - a.dishesCount);

  const channelBreakdown = Array.from(channelStatsMap.values())
    .map((c) => ({
      channel: c.channel,
      ticketsCount: c.ticketsCount,
      avgPrepMins: c.ticketsCount > 0 ? Math.round(c.totalPrepMins / c.ticketsCount) : 0,
      onTimeRatePct:
        c.ticketsCount > 0 ? Math.round((c.onTimeCount / c.ticketsCount) * 100) : 100,
    }))
    .sort((a, b) => b.ticketsCount - a.ticketsCount);

  const staffLeaderboard = Array.from(staffStatsMap.values())
    .map((st) => ({
      staffName: st.staffName,
      ticketsCompleted: st.ticketsCompleted,
      dishesPrepared: st.dishesPrepared,
      avgPrepMins:
        st.ticketsCompleted > 0 ? Math.round(st.totalPrepMins / st.ticketsCompleted) : 0,
      onTimeRatePct:
        st.ticketsCompleted > 0
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

export const getStationWorkloadSummary = async (
  tenantId: number,
  branchId?: number
) => {
  const rows = await db
    .select({
      station: resolvedItemStationSql,
      pendingItemsCount: sql<number>`COALESCE(SUM(CASE WHEN COALESCE(${orderItems.kitchenStatus}, 'New') != 'Ready' THEN CAST(${orderItems.quantity} AS NUMERIC) ELSE 0 END), 0)::int`,
      readyItemsCount: sql<number>`COALESCE(SUM(CASE WHEN ${orderItems.kitchenStatus} = 'Ready' THEN CAST(${orderItems.quantity} AS NUMERIC) ELSE 0 END), 0)::int`,
      activeTicketsCount: sql<number>`COUNT(DISTINCT CASE WHEN COALESCE(${orderItems.kitchenStatus}, 'New') != 'Ready' THEN ${orders.id} END)::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined,
        inArray(orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing'])
      )
    )
    .groupBy(resolvedItemStationSql)
    .orderBy(asc(resolvedItemStationSql));

  return rows.map((r) => ({
    station: r.station,
    pendingItemsCount: Number(r.pendingItemsCount || 0),
    readyItemsCount: Number(r.readyItemsCount || 0),
    activeTicketsCount: Number(r.activeTicketsCount || 0),
  }));
};

export const bumpStationItemsOnOrder = async (
  tenantId: number,
  userId: number | null,
  orderId: number,
  station: string
) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .limit(1);

    if (!order) {
      throw new Error('Kitchen order ticket not found');
    }

    const lines = await tx
      .select({
        id: orderItems.id,
        kitchenStatus: orderItems.kitchenStatus,
        station: resolvedItemStationSql,
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, orderId)));

    const targetIds = lines
      .filter((l) => station === 'ALL' || l.station === station)
      .map((l) => l.id);

    if (targetIds.length === 0) {
      throw new Error(`No line items found for station "${station}" on order ${order.orderNumber}`);
    }

    await tx
      .update(orderItems)
      .set({ kitchenStatus: 'Ready' })
      .where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.id, targetIds)));

    const targetIdSet = new Set(targetIds);
    const allItemsReady = lines.every(
      (l) => targetIdSet.has(l.id) || l.kitchenStatus === 'Ready'
    );

    const nextOrderStatus = allItemsReady
      ? 'Ready'
      : order.status === 'Confirmed' || order.status === 'Sent-To-Kitchen'
        ? 'Preparing'
        : order.status;

    if (nextOrderStatus !== order.status) {
      await tx
        .update(orders)
        .set({ status: nextOrderStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }

    await tx.insert(auditLogs).values({
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

// ============================================================================
// STATION MASTER DATA, SLA THRESHOLDS & ROUTING CONFIGURATION (ZERO AUTO-SEED)
// ============================================================================

export const listConfiguredKitchenStations = async (
  tenantId: number,
  branchId?: number
) => {
  const rows = await db
    .select({
      id: kitchenStations.id,
      tenantId: kitchenStations.tenantId,
      branchId: kitchenStations.branchId,
      branchName: branches.name,
      branchCode: branches.code,
      name: kitchenStations.name,
      code: kitchenStations.code,
      stationType: kitchenStations.stationType,
      colorHex: kitchenStations.colorHex,
      targetPrepTimeMinutes: kitchenStations.targetPrepTimeMinutes,
      warningTimeMinutes: kitchenStations.warningTimeMinutes,
      criticalTimeMinutes: kitchenStations.criticalTimeMinutes,
      assignedCategories: kitchenStations.assignedCategories,
      autoBumpOnPrint: kitchenStations.autoBumpOnPrint,
      soundAlertOnNewTicket: kitchenStations.soundAlertOnNewTicket,
      allowTicketRecall: kitchenStations.allowTicketRecall,
      backupStationId: kitchenStations.backupStationId,
      backupStationName: sql<string | null>`(SELECT bs.name FROM kitchen_stations bs WHERE bs.id = ${kitchenStations.backupStationId})`,
      isActive: kitchenStations.isActive,
      mappedMenuItemsCount: sql<number>`(
        SELECT COUNT(DISTINCT mi.id)::int
        FROM menu_items mi
        LEFT JOIN menu_categories mc ON mi.category_id = mc.id
        WHERE mi.tenant_id = ${tenantId}
          AND mi.is_available = true
          AND (
            LOWER(TRIM(COALESCE(mi.kitchen_station, ''))) = LOWER(TRIM(${kitchenStations.name}))
            OR LOWER(TRIM(COALESCE(mi.kitchen_station, ''))) = LOWER(TRIM(${kitchenStations.code}))
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(${kitchenStations.assignedCategories}) AS cat
              WHERE LOWER(TRIM(cat)) = 'all'
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mc.name, '')))
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mi.kitchen_station, '')))
            )
            OR (
              ${kitchenStations.stationType} = 'BAR'
              AND (
                LOWER(COALESCE(mi.kitchen_station, '')) LIKE '%bar%'
                OR LOWER(COALESCE(mi.kitchen_station, '')) LIKE '%beverage%'
              )
            )
          )
      )`,
      activeDishesCount: sql<number>`(
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
            OR o.branch_id = ${kitchenStations.branchId}
            OR NOT EXISTS (
              SELECT 1 FROM kitchen_stations ks_b
              WHERE ks_b.tenant_id = ${tenantId}
                AND ks_b.branch_id = o.branch_id
                AND ks_b.is_active = true
            )
          )
          AND (
            LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${kitchenStations.name}))
            OR LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${kitchenStations.code}))
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(${kitchenStations.assignedCategories}) AS cat
              WHERE LOWER(TRIM(cat)) = 'all'
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mc.name, '')))
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen')))
            )
            OR (
              ${kitchenStations.stationType} = 'BAR'
              AND (
                LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%bar%'
                OR LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%beverage%'
              )
            )
          )
      )`,
      activeTicketsCount: sql<number>`(
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
            OR o.branch_id = ${kitchenStations.branchId}
            OR NOT EXISTS (
              SELECT 1 FROM kitchen_stations ks_b
              WHERE ks_b.tenant_id = ${tenantId}
                AND ks_b.branch_id = o.branch_id
                AND ks_b.is_active = true
            )
          )
          AND (
            LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${kitchenStations.name}))
            OR LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen'))) = LOWER(TRIM(${kitchenStations.code}))
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(${kitchenStations.assignedCategories}) AS cat
              WHERE LOWER(TRIM(cat)) = 'all'
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(mc.name, '')))
                 OR LOWER(TRIM(cat)) = LOWER(TRIM(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), 'Main Kitchen')))
            )
            OR (
              ${kitchenStations.stationType} = 'BAR'
              AND (
                LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%bar%'
                OR LOWER(COALESCE(NULLIF(SUBSTRING(oi.notes FROM '\\[STATION:([^\\]]+)\\]'), ''), NULLIF(TRIM(mi.kitchen_station), ''), '')) LIKE '%beverage%'
              )
            )
          )
      )`,
      createdAt: kitchenStations.createdAt,
      updatedAt: kitchenStations.updatedAt,
    })
    .from(kitchenStations)
    .leftJoin(branches, eq(kitchenStations.branchId, branches.id))
    .where(
      and(
        eq(kitchenStations.tenantId, tenantId),
        branchId ? eq(kitchenStations.branchId, branchId) : undefined
      )
    )
    .orderBy(asc(kitchenStations.branchId), asc(kitchenStations.name));

  return rows;
};

export const getKitchenGlobalSettingsRecord = async (tenantId: number) => {
  const [settings] = await db
    .select()
    .from(kitchenGlobalSettings)
    .where(eq(kitchenGlobalSettings.tenantId, tenantId))
    .limit(1);

  return settings || null;
};

export const listTenantMenuCategoriesForRouting = async (tenantId: number) => {
  return await db
    .select({
      id: menuCategories.id,
      name: menuCategories.name,
    })
    .from(menuCategories)
    .where(and(eq(menuCategories.tenantId, tenantId), eq(menuCategories.isActive, true)))
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
};

export const createKitchenStationRecord = async (
  tenantId: number,
  userId: number | null,
  input: CreateKitchenStationInput
) => {
  return await db.transaction(async (tx) => {
    const [branch] = await tx
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.id, input.branchId), eq(branches.tenantId, tenantId)))
      .limit(1);

    if (!branch) {
      throw new Error('Selected branch outlet does not belong to this workspace');
    }

    const [created] = await tx
      .insert(kitchenStations)
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

    await tx.insert(auditLogs).values({
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

export const updateKitchenStationRecord = async (
  tenantId: number,
  userId: number | null,
  stationId: number,
  input: UpdateKitchenStationInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(kitchenStations)
      .where(and(eq(kitchenStations.id, stationId), eq(kitchenStations.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      throw new Error('Kitchen station not found');
    }

    const [updated] = await tx
      .update(kitchenStations)
      .set({
        ...input,
        backupStationId:
          input.backupStationId !== undefined
            ? input.backupStationId
            : existing.backupStationId,
        updatedAt: new Date(),
      })
      .where(eq(kitchenStations.id, stationId))
      .returning();

    await tx.insert(auditLogs).values({
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

export const deleteKitchenStationRecord = async (
  tenantId: number,
  userId: number | null,
  stationId: number
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(kitchenStations)
      .where(and(eq(kitchenStations.id, stationId), eq(kitchenStations.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      throw new Error('Kitchen station not found');
    }

    await tx.delete(kitchenStations).where(eq(kitchenStations.id, stationId));

    await tx.insert(auditLogs).values({
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

export const upsertKitchenGlobalSettingsRecord = async (
  tenantId: number,
  userId: number | null,
  input: UpdateKitchenGlobalSettingsInput
) => {
  return await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(kitchenGlobalSettings)
      .where(eq(kitchenGlobalSettings.tenantId, tenantId))
      .limit(1);

    let saved;
    if (!existing) {
      const [created] = await tx
        .insert(kitchenGlobalSettings)
        .values({
          tenantId,
          ...input,
        })
        .returning();
      saved = created;
    } else {
      const [updated] = await tx
        .update(kitchenGlobalSettings)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(kitchenGlobalSettings.tenantId, tenantId))
        .returning();
      saved = updated;
    }

    await tx.insert(auditLogs).values({
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