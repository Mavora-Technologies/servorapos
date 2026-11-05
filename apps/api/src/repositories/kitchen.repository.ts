import { eq, and, inArray, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { orders, orderItems, menuItems } from '../config/schema';

export const getActiveKitchenTickets = async (tenantId: number, station?: string) => {
  const flatTickets = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    orderType: orders.orderType,
    status: orders.status,
    createdAt: orders.createdAt,
    orderItemId: orderItems.id,
    quantity: orderItems.quantity,
    menuItemName: menuItems.name,
    kitchenStation: menuItems.kitchenStation,
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
  .where(
    and(
      eq(orders.tenantId, tenantId),
      inArray(orders.status, ['Confirmed', 'Preparing']),
      station && station !== 'ALL' ? eq(menuItems.kitchenStation, station) : undefined
    )
  );

  const grouped = flatTickets.reduce((acc, row) => {
    if (!acc[row.id]) {
      acc[row.id] = {
        id: row.id,
        orderNumber: row.orderNumber,
        orderType: row.orderType,
        status: row.status,
        createdAt: row.createdAt,
        items: []
      };
    }
    if (row.orderItemId) {
      acc[row.id].items.push({
        id: row.orderItemId,
        quantity: row.quantity,
        name: row.menuItemName || 'Unknown Item',
        station: row.kitchenStation || 'MAIN_KITCHEN'
      });
    }
    return acc;
  }, {} as Record<number, any>);

  return Object.values(grouped).sort((a: any, b: any) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

export const updateTicketStatus = async (tenantId: number, orderId: number, status: string) => {
  const [updatedOrder] = await db.update(orders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
    .returning();
  return updatedOrder;
};

export const getKitchenHistoryTickets = async (tenantId: number) => {
  const flatTickets = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    orderType: orders.orderType,
    status: orders.status,
    createdAt: orders.createdAt,
    updatedAt: orders.updatedAt,
    orderItemId: orderItems.id,
    quantity: orderItems.quantity,
    menuItemName: menuItems.name,
  })
  .from(orders)
  .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
  .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
  .where(
    and(
      eq(orders.tenantId, tenantId),
      inArray(orders.status, ['Completed', 'Ready', 'Cancelled', 'Served'])
    )
  )
  .orderBy(desc(orders.updatedAt))
  .limit(100);

  const grouped = flatTickets.reduce((acc, row) => {
    if (!acc[row.id]) {
      acc[row.id] = {
        id: row.id,
        orderNumber: row.orderNumber,
        orderType: row.orderType,
        status: row.status,
        createdAt: row.createdAt,
        completedAt: row.updatedAt,
        items: []
      };
    }
    if (row.orderItemId) {
      acc[row.id].items.push({
        id: row.orderItemId,
        quantity: row.quantity,
        name: row.menuItemName || 'Unknown Item'
      });
    }
    return acc;
  }, {} as Record<number, any>);

  return Object.values(grouped);
};

export const getKitchenPerformanceStats = async (tenantId: number) => {
  // Fetch completed/ready orders to calculate prep times and volume
  const completedOrders = await db.select({
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
      inArray(orders.status, ['Completed', 'Ready', 'Served'])
    )
  )
  .limit(200);

  let totalPrepTimeMinutes = 0;
  let delayedOrdersCount = 0;
  const totalOrders = completedOrders.length;

  const ordersWithDuration = completedOrders.map(order => {
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

  const avgPrepTime = totalOrders > 0 ? Math.round(totalPrepTimeMinutes / totalOrders) : 0;
  const onTimeRate = totalOrders > 0 ? Math.round(((totalOrders - delayedOrdersCount) / totalOrders) * 100) : 100;

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