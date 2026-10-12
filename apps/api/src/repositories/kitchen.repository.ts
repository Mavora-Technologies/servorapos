import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { orders, orderItems, menuItems } from '../config/schema';

export const getActiveKitchenTickets = async (tenantId: number) => {
  // Fetch flat data joining orders to items to menu names
  const flatTickets = await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    orderType: orders.orderType,
    status: orders.status,
    createdAt: orders.createdAt,
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
      inArray(orders.status, ['Confirmed', 'Preparing'])
    )
  );

  // Reduce flat rows into nested order objects for the frontend
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
        name: row.menuItemName || 'Unknown Item'
      });
    }
    return acc;
  }, {} as Record<number, any>);

  // Sort by oldest first (First-In, First-Out)
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