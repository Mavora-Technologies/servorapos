"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markDeliveredTransaction = exports.assignDriverTransaction = exports.fetchDeliveryOrders = void 0;
// apps/api/src/repositories/delivery.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const fetchDeliveryOrders = async (tenantId) => {
    return await db_1.db.select({
        id: schema_1.orders.id,
        orderNumber: schema_1.orders.orderNumber,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        total: schema_1.orders.total,
        createdAt: schema_1.orders.createdAt,
        provider: schema_1.deliveryAssignments.provider,
        driverName: schema_1.deliveryAssignments.driverName,
        driverPhone: schema_1.deliveryAssignments.driverPhone,
        trackingUrl: schema_1.deliveryAssignments.trackingUrl,
        dispatchedAt: schema_1.deliveryAssignments.dispatchedAt,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.deliveryAssignments, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.deliveryAssignments.orderId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.orderType, 'Delivery')))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
};
exports.fetchDeliveryOrders = fetchDeliveryOrders;
const assignDriverTransaction = async (tenantId, orderId, dispatchData) => {
    return await db_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.deliveryAssignments).values({
            tenantId,
            orderId,
            provider: dispatchData.provider,
            driverName: dispatchData.driverName,
            driverPhone: dispatchData.driverPhone,
            trackingUrl: dispatchData.trackingUrl || null,
            deliveryFee: dispatchData.deliveryFee?.toString() || '0',
        });
        const [updatedOrder] = await tx.update(schema_1.orders)
            .set({ status: 'Dispatched', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        return updatedOrder;
    });
};
exports.assignDriverTransaction = assignDriverTransaction;
const markDeliveredTransaction = async (tenantId, orderId) => {
    return await db_1.db.transaction(async (tx) => {
        await tx.update(schema_1.deliveryAssignments)
            .set({ deliveredAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.tenantId, tenantId)));
        const [updatedOrder] = await tx.update(schema_1.orders)
            .set({ status: 'Completed', updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        return updatedOrder;
    });
};
exports.markDeliveredTransaction = markDeliveredTransaction;
