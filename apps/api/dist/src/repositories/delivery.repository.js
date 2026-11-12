"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markDeliveredTransaction = exports.assignDriverTransaction = exports.fetchFleetStaffDirectory = exports.fetchDeliveryOrders = void 0;
// apps/api/src/repositories/delivery.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const fetchDeliveryOrders = async (tenantId, query) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Delivery%'),
        query?.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined,
        query?.provider && query.provider !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.provider, query.provider)
            : undefined,
        query?.paymentStatus && query.paymentStatus !== 'ALL'
            ? (0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) = UPPER(${query.paymentStatus})`
            : undefined,
        query?.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.orders.orderNumber, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.orders.customerName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.orders.customerPhone, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.deliveryAssignments.driverName, `%${query.search}%`), (0, drizzle_orm_1.ilike)(schema_1.deliveryAssignments.provider, `%${query.search}%`))
            : undefined,
    ].filter(Boolean);
    return await db_1.db
        .select({
        id: schema_1.orders.id,
        branchId: schema_1.orders.branchId,
        branchName: schema_1.branches.name,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        customerName: schema_1.orders.customerName,
        customerPhone: schema_1.orders.customerPhone,
        notes: schema_1.orders.notes,
        total: schema_1.orders.total,
        createdAt: schema_1.orders.createdAt,
        assignmentId: schema_1.deliveryAssignments.id,
        provider: schema_1.deliveryAssignments.provider,
        driverName: schema_1.deliveryAssignments.driverName,
        driverPhone: schema_1.deliveryAssignments.driverPhone,
        trackingUrl: schema_1.deliveryAssignments.trackingUrl,
        deliveryFee: schema_1.deliveryAssignments.deliveryFee,
        dispatchedAt: schema_1.deliveryAssignments.dispatchedAt,
        deliveredAt: schema_1.deliveryAssignments.deliveredAt,
        itemsCount: (0, drizzle_orm_1.sql) `(SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int FROM order_items oi WHERE oi.order_id = ${schema_1.orders.id})`,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.deliveryAssignments, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.deliveryAssignments.orderId))
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
};
exports.fetchDeliveryOrders = fetchDeliveryOrders;
const fetchFleetStaffDirectory = async (tenantId) => {
    return await db_1.db
        .select({
        id: schema_1.users.id,
        fullName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.users.isActive, true)))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.users.firstName));
};
exports.fetchFleetStaffDirectory = fetchFleetStaffDirectory;
const assignDriverTransaction = async (tenantId, userId, orderId, input) => {
    return await db_1.db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .limit(1);
        if (!order)
            throw new Error('Delivery order not found');
        const driverLabel = [input.driverName, input.vehicleRegistration].filter(Boolean).join(' • ') ||
            `${input.provider} Courier`;
        await tx.insert(schema_1.deliveryAssignments).values({
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
            .update(schema_1.orders)
            .set({
            status: 'Dispatched',
            notes: input.deliveryNotes
                ? [order.notes, input.deliveryNotes].filter(Boolean).join(' | ')
                : order.notes,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        await tx.insert(schema_1.auditLogs).values({
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
exports.assignDriverTransaction = assignDriverTransaction;
const markDeliveredTransaction = async (tenantId, userId, orderId) => {
    return await db_1.db.transaction(async (tx) => {
        const now = new Date();
        await tx
            .update(schema_1.deliveryAssignments)
            .set({
            status: 'Delivered',
            deliveredAt: now,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.deliveryAssignments.tenantId, tenantId)));
        const [updatedOrder] = await tx
            .update(schema_1.orders)
            .set({ status: 'Completed', updatedAt: now })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        if (updatedOrder) {
            await tx.insert(schema_1.auditLogs).values({
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
exports.markDeliveredTransaction = markDeliveredTransaction;
