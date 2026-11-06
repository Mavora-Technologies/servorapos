"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKitchenPerformanceStats = exports.getKitchenHistoryTickets = exports.updateTicketStatus = exports.getActiveKitchenTickets = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getActiveKitchenTickets = async (tenantId, station) => {
    const flatTickets = await db_1.db.select({
        id: schema_1.orders.id,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        createdAt: schema_1.orders.createdAt,
        orderItemId: schema_1.orderItems.id,
        quantity: schema_1.orderItems.quantity,
        menuItemName: schema_1.menuItems.name,
        kitchenStation: schema_1.menuItems.kitchenStation,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Preparing']), station && station !== 'ALL' ? (0, drizzle_orm_1.eq)(schema_1.menuItems.kitchenStation, station) : undefined));
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
    }, {});
    return Object.values(grouped).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};
exports.getActiveKitchenTickets = getActiveKitchenTickets;
const updateTicketStatus = async (tenantId, orderId, status) => {
    const [updatedOrder] = await db_1.db.update(schema_1.orders)
        .set({ status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
        .returning();
    return updatedOrder;
};
exports.updateTicketStatus = updateTicketStatus;
const getKitchenHistoryTickets = async (tenantId) => {
    const flatTickets = await db_1.db.select({
        id: schema_1.orders.id,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        createdAt: schema_1.orders.createdAt,
        updatedAt: schema_1.orders.updatedAt,
        orderItemId: schema_1.orderItems.id,
        quantity: schema_1.orderItems.quantity,
        menuItemName: schema_1.menuItems.name,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Completed', 'Ready', 'Cancelled', 'Served'])))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.updatedAt))
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
    }, {});
    return Object.values(grouped);
};
exports.getKitchenHistoryTickets = getKitchenHistoryTickets;
const getKitchenPerformanceStats = async (tenantId) => {
    // Fetch completed/ready orders to calculate prep times and volume
    const completedOrders = await db_1.db.select({
        id: schema_1.orders.id,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        createdAt: schema_1.orders.createdAt,
        updatedAt: schema_1.orders.updatedAt,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Completed', 'Ready', 'Served'])))
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
exports.getKitchenPerformanceStats = getKitchenPerformanceStats;
