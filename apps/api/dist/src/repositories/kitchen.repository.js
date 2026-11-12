"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKitchenPerformanceStats = exports.getKitchenHistoryTickets = exports.updateLineItemKitchenStatus = exports.updateTicketStatus = exports.getActiveKitchenTickets = exports.getDistinctTenantKitchenStations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const getDistinctTenantKitchenStations = async (tenantId) => {
    const rows = await db_1.db
        .selectDistinct({
        station: schema_1.menuItems.kitchenStation,
    })
        .from(schema_1.menuItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, tenantId), (0, drizzle_orm_1.isNotNull)(schema_1.menuItems.kitchenStation), (0, drizzle_orm_1.sql) `TRIM(${schema_1.menuItems.kitchenStation}) != ''`))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.menuItems.kitchenStation));
    return rows.map((r) => r.station).filter(Boolean);
};
exports.getDistinctTenantKitchenStations = getDistinctTenantKitchenStations;
const getActiveKitchenTickets = async (tenantId, query = {}) => {
    const conditions = [
        (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId),
        (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Sent-To-Kitchen', 'Preparing']),
        query.branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId) : undefined,
        query.orderType && query.orderType !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.orders.orderType, query.orderType)
            : undefined,
        query.station && query.station !== 'ALL'
            ? (0, drizzle_orm_1.eq)(schema_1.menuItems.kitchenStation, query.station)
            : undefined,
    ].filter(Boolean);
    const flatTickets = await db_1.db
        .select({
        id: schema_1.orders.id,
        branchId: schema_1.orders.branchId,
        branchName: schema_1.branches.name,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        tableName: schema_1.orders.tableName,
        customerName: schema_1.orders.customerName,
        orderNotes: schema_1.orders.notes,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        createdAt: schema_1.orders.createdAt,
        orderItemId: schema_1.orderItems.id,
        quantity: schema_1.orderItems.quantity,
        kitchenStatus: schema_1.orderItems.kitchenStatus,
        itemNotes: schema_1.orderItems.notes,
        selectedModifiers: schema_1.orderItems.selectedModifiers,
        menuItemName: schema_1.menuItems.name,
        kitchenStation: schema_1.menuItems.kitchenStation,
        prepTimeMinutes: schema_1.menuItems.prepTimeMinutes,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)(...conditions));
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
    }, {});
    // FIFO chronological queue (oldest tickets first)
    return Object.values(grouped).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};
exports.getActiveKitchenTickets = getActiveKitchenTickets;
const updateTicketStatus = async (tenantId, userId, orderId, status) => {
    return await db_1.db.transaction(async (tx) => {
        const [updatedOrder] = await tx
            .update(schema_1.orders)
            .set({ status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        if (!updatedOrder) {
            throw new Error('Kitchen ticket not found');
        }
        // Cascade item-level kitchenStatus when bumped to Preparing or Ready
        if (status === 'Preparing' || status === 'Ready') {
            await tx
                .update(schema_1.orderItems)
                .set({ kitchenStatus: status })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)));
        }
        await tx.insert(schema_1.auditLogs).values({
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
exports.updateTicketStatus = updateTicketStatus;
const updateLineItemKitchenStatus = async (tenantId, orderItemId, kitchenStatus) => {
    const [updated] = await db_1.db
        .update(schema_1.orderItems)
        .set({ kitchenStatus })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.id, orderItemId), (0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId)))
        .returning();
    if (!updated) {
        throw new Error('Order line item not found');
    }
    return updated;
};
exports.updateLineItemKitchenStatus = updateLineItemKitchenStatus;
const getKitchenHistoryTickets = async (tenantId, branchId) => {
    const flatTickets = await db_1.db
        .select({
        id: schema_1.orders.id,
        branchName: schema_1.branches.name,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        tableName: schema_1.orders.tableName,
        status: schema_1.orders.status,
        createdAt: schema_1.orders.createdAt,
        updatedAt: schema_1.orders.updatedAt,
        orderItemId: schema_1.orderItems.id,
        quantity: schema_1.orderItems.quantity,
        menuItemName: schema_1.menuItems.name,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.orderItems, (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderItems.orderId))
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined, (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Completed', 'Ready', 'Cancelled', 'Served'])))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.updatedAt))
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
    }, {});
    return Object.values(grouped);
};
exports.getKitchenHistoryTickets = getKitchenHistoryTickets;
const getKitchenPerformanceStats = async (tenantId, branchId) => {
    const completedOrders = await db_1.db
        .select({
        id: schema_1.orders.id,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        createdAt: schema_1.orders.createdAt,
        updatedAt: schema_1.orders.updatedAt,
    })
        .from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined, (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Completed', 'Ready', 'Served'])))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.updatedAt))
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
    const avgPrepTime = totalOrders > 0 ? Math.round(totalPrepTimeMinutes / totalOrders) : 0;
    const onTimeRate = totalOrders > 0
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
exports.getKitchenPerformanceStats = getKitchenPerformanceStats;
