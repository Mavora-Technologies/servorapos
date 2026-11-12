import { eq, and, inArray, desc, asc, sql, isNotNull } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  branches,
  auditLogs,
} from '../config/schema';
import { KitchenTicketsQuery } from '../validators/kitchen.validator';

export const getDistinctTenantKitchenStations = async (tenantId: number) => {
  const rows = await db
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
    )
    .orderBy(asc(menuItems.kitchenStation));

  return rows.map((r) => r.station!).filter(Boolean);
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
      ? eq(menuItems.kitchenStation, query.station)
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
      itemNotes: orderItems.notes,
      selectedModifiers: orderItems.selectedModifiers,
      menuItemName: menuItems.name,
      kitchenStation: menuItems.kitchenStation,
      prepTimeMinutes: menuItems.prepTimeMinutes,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
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
        station: row.kitchenStation || 'Main Kitchen',
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

    // Cascade item-level kitchenStatus when bumped to Preparing or Ready
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
  branchId?: number
) => {
  const flatTickets = await db
    .select({
      id: orders.id,
      branchName: branches.name,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      tableName: orders.tableName,
      status: orders.status,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      orderItemId: orderItems.id,
      quantity: orderItems.quantity,
      menuItemName: menuItems.name,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined,
        inArray(orders.status, ['Completed', 'Ready', 'Cancelled', 'Served'])
      )
    )
    .orderBy(desc(orders.updatedAt))
    .limit(100);

  const grouped = flatTickets.reduce((acc, row) => {
    if (!acc[row.id]) {
      acc[row.id] = {
        id: row.id,
        branchName: row.branchName,
        orderNumber: row.orderNumber,
        orderType: row.orderType,
        tableName: row.tableName,
        status: row.status,
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
      });
    }
    return acc;
  }, {} as Record<number, any>);

  return Object.values(grouped);
};

export const getKitchenPerformanceStats = async (
  tenantId: number,
  branchId?: number
) => {
  const completedOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined,
        inArray(orders.status, ['Completed', 'Ready', 'Served'])
      )
    )
    .orderBy(desc(orders.updatedAt))
    .limit(200);

  let totalPrepTimeMinutes = 0;
  let delayedOrdersCount = 0;
  const totalOrders = completedOrders.length;

  const ordersWithDuration = completedOrders.map((order) => {
    const start = new Date(order.createdAt).getTime();
    const end = new Date(order.updatedAt).getTime();
    const durationMins = Math.max(1, Math.round((end - start) / 60000));

    totalPrepTimeMinutes += durationMins;
    if (durationMins > 15) {
      delayedOrdersCount++;
    }

    return {
      ...order,
      durationMins,
    };
  });

  const avgPrepTime =
    totalOrders > 0 ? Math.round(totalPrepTimeMinutes / totalOrders) : 0;
  const onTimeRate =
    totalOrders > 0
      ? Math.round(((totalOrders - delayedOrdersCount) / totalOrders) * 100)
      : 100;

  return {
    summary: {
      totalProcessed: totalOrders,
      avgPrepTimeMinutes: avgPrepTime,
      onTimeRatePercentage: onTimeRate,
      delayedOrders: delayedOrdersCount,
    },
    recentExecutions: ordersWithDuration.slice(0, 10),
  };
};