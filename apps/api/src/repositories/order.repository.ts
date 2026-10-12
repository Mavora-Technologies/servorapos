import { eq, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { orders, orderItems } from '../config/schema';
import { inArray, and } from 'drizzle-orm';


export const createOrderRecord = async (tenantId: number, data: any, items: any[]) => {
  return await db.transaction(async (tx) => {
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    
    const [newOrder] = await tx.insert(orders).values({
      tenantId,
      orderNumber,
      orderType: data.orderType,
      status: 'Confirmed', // Automatically send to kitchen/active state on POS checkout
      paymentStatus: 'Paid',
      subtotal: data.subtotal.toString(),
      tax: data.tax.toString(),
      total: data.total.toString(),
    }).returning();

    for (const item of items) {
      await tx.insert(orderItems).values({
        orderId: newOrder.id,
        menuItemId: parseInt(item.id),
        quantity: item.quantity,
        unitPrice: item.price.toString(),
        totalPrice: (item.price * item.quantity).toString(),
      });
    }

    return newOrder;
  });
};

export const fetchTenantOrders = async (tenantId: number) => {
  return await db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(desc(orders.createdAt));
};

export const fetchOpenOrders = async (tenantId: number) => {
  return await db.select().from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        inArray(orders.status, ['Confirmed', 'Preparing', 'Ready'])
      )
    )
    .orderBy(desc(orders.createdAt));
};

export const updateOrderStatus = async (tenantId: number, orderId: number, status: string) => {
  const [updatedOrder] = await db.update(orders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
    .returning();
  return updatedOrder;
};

export const fetchTakeawayOrders = async (tenantId: number) => {
  return await db.select().from(orders)
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.orderType, 'Takeaway')
      )
    )
    .orderBy(desc(orders.createdAt));
};