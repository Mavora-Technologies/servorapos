// apps/api/src/repositories/delivery.repository.ts
import { eq, and, desc, asc, sql, or, ilike } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  deliveryAssignments,
  branches,
  users,
  auditLogs,
} from '../config/schema';
import {
  ListDeliveriesQuery,
  DispatchDeliveryInput,
} from '../validators/delivery.validator';

export const fetchDeliveryOrders = async (
  tenantId: number,
  query?: ListDeliveriesQuery
) => {
  const conditions = [
    eq(orders.tenantId, tenantId),
    ilike(orders.orderType, '%Delivery%'),
    query?.branchId ? eq(orders.branchId, query.branchId) : undefined,
    query?.provider && query.provider !== 'ALL'
      ? eq(deliveryAssignments.provider, query.provider)
      : undefined,
    query?.paymentStatus && query.paymentStatus !== 'ALL'
      ? sql`UPPER(${orders.paymentStatus}) = UPPER(${query.paymentStatus})`
      : undefined,
    query?.search
      ? or(
        ilike(orders.orderNumber, `%${query.search}%`),
        ilike(orders.customerName, `%${query.search}%`),
        ilike(orders.customerPhone, `%${query.search}%`),
        ilike(deliveryAssignments.driverName, `%${query.search}%`),
        ilike(deliveryAssignments.provider, `%${query.search}%`)
      )
      : undefined,
  ].filter(Boolean);

  return await db
    .select({
      id: orders.id,
      branchId: orders.branchId,
      branchName: branches.name,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      notes: orders.notes,
      total: orders.total,
      createdAt: orders.createdAt,
      assignmentId: deliveryAssignments.id,
      provider: deliveryAssignments.provider,
      driverName: deliveryAssignments.driverName,
      driverPhone: deliveryAssignments.driverPhone,
      trackingUrl: deliveryAssignments.trackingUrl,
      deliveryFee: deliveryAssignments.deliveryFee,
      dispatchedAt: deliveryAssignments.dispatchedAt,
      deliveredAt: deliveryAssignments.deliveredAt,
      itemsCount: sql<number>`(SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int FROM order_items oi WHERE oi.order_id = ${orders.id})`,
    })
    .from(orders)
    .leftJoin(deliveryAssignments, eq(orders.id, deliveryAssignments.orderId))
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt));
};

export const fetchFleetStaffDirectory = async (tenantId: number) => {
  return await db
    .select({
      id: users.id,
      fullName: sql<string>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
    .orderBy(asc(users.firstName));
};

export const assignDriverTransaction = async (
  tenantId: number,
  userId: number,
  orderId: number,
  input: DispatchDeliveryInput
) => {
  return await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .limit(1);

    if (!order) throw new Error('Delivery order not found');

    const driverLabel =
      [input.driverName, input.vehicleRegistration].filter(Boolean).join(' • ') ||
      `${input.provider} Courier`;

    await tx.insert(deliveryAssignments).values({
      tenantId,
      orderId,
      branchId: order.branchId ?? null,
      provider: input.provider,
      driverName: driverLabel,
      driverPhone: input.driverPhone || null,
      trackingUrl: input.trackingUrl || null,
      deliveryFee: input.deliveryFee.toFixed(2),
      status: 'Dispatched',
      dispatchedAt: new Date(),
    });

    const [updatedOrder] = await tx
      .update(orders)
      .set({
        status: 'Dispatched',
        notes: input.deliveryNotes
          ? [order.notes, input.deliveryNotes].filter(Boolean).join(' | ')
          : order.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: order.branchId ?? null,
      userId,
      action: 'DELIVERY_DISPATCHED',
      module: 'TMS',
      entityType: 'orders',
      entityId: String(orderId),
      reason: `Dispatched ${order.orderNumber} via ${input.provider}${driverLabel ? ` (${driverLabel})` : ''}`,
      newValues: {
        provider: input.provider,
        driverName: driverLabel || null,
        deliveryFee: input.deliveryFee,
      },
    });

    return updatedOrder;
  });
};

export const markDeliveredTransaction = async (
  tenantId: number,
  userId: number,
  orderId: number
) => {
  return await db.transaction(async (tx) => {
    const now = new Date();

    await tx
      .update(deliveryAssignments)
      .set({
        status: 'Delivered',
        deliveredAt: now,
      })
      .where(
        and(
          eq(deliveryAssignments.orderId, orderId),
          eq(deliveryAssignments.tenantId, tenantId)
        )
      );

    const [updatedOrder] = await tx
      .update(orders)
      .set({ status: 'Completed', updatedAt: now })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();

    if (updatedOrder) {
      await tx.insert(auditLogs).values({
        tenantId,
        branchId: updatedOrder.branchId ?? null,
        userId,
        action: 'DELIVERY_POD_CONFIRMED',
        module: 'TMS',
        entityType: 'orders',
        entityId: String(orderId),
        reason: `Proof of Delivery confirmed for ${updatedOrder.orderNumber}`,
      });
    }

    return updatedOrder;
  });
};