import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/db';
import { orders, deliveryAssignments } from '../config/schema';

export const fetchDeliveryOrders = async (tenantId: number) => {
  return await db.select({
    id: orders.id,
    orderNumber: orders.orderNumber,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    total: orders.total,
    createdAt: orders.createdAt,
    provider: deliveryAssignments.provider,
    driverName: deliveryAssignments.driverName,
    driverPhone: deliveryAssignments.driverPhone,
    trackingUrl: deliveryAssignments.trackingUrl,
    dispatchedAt: deliveryAssignments.dispatchedAt,
  })
  .from(orders)
  .leftJoin(deliveryAssignments, eq(orders.id, deliveryAssignments.orderId))
  .where(and(eq(orders.tenantId, tenantId), eq(orders.orderType, 'Delivery')))
  .orderBy(desc(orders.createdAt));
};

export const assignDriverTransaction = async (tenantId: number, orderId: number, dispatchData: any) => {
  return await db.transaction(async (tx) => {
    await tx.insert(deliveryAssignments).values({
      tenantId,
      orderId,
      provider: dispatchData.provider,
      driverName: dispatchData.driverName,
      driverPhone: dispatchData.driverPhone,
      trackingUrl: dispatchData.trackingUrl || null,
      deliveryFee: dispatchData.deliveryFee?.toString() || '0',
    });

    const [updatedOrder] = await tx.update(orders)
      .set({ status: 'Dispatched', updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();
      
    return updatedOrder;
  });
};

export const markDeliveredTransaction = async (tenantId: number, orderId: number) => {
  return await db.transaction(async (tx) => {
    await tx.update(deliveryAssignments)
      .set({ deliveredAt: new Date() })
      .where(and(eq(deliveryAssignments.orderId, orderId), eq(deliveryAssignments.tenantId, tenantId)));

    const [updatedOrder] = await tx.update(orders)
      .set({ status: 'Completed', updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();
      
    return updatedOrder;
  });
};