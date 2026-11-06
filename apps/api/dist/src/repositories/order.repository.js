"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTakeawayOrders = exports.updateOrderStatus = exports.fetchOpenOrders = exports.fetchTenantOrders = exports.createOrderRecord = void 0;
// apps/api/src/repositories/order.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const createOrderRecord = async (tenantId, data, items) => {
    return await db_1.db.transaction(async (tx) => {
        const orderNumber = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const subtotal = Number(data.subtotal) || items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
        const tax = Number(data.tax) || Number((subtotal * 0.16).toFixed(2));
        const total = Number(data.total) || (subtotal + tax);
        // 1. Insert Order Header
        const [newOrder] = await tx.insert(schema_1.orders).values({
            tenantId,
            branchId: data.branchId ?? null,
            tableId: data.tableId ?? null,
            tableName: data.tableName ?? data.orderType ?? 'Counter POS',
            orderNumber,
            orderType: data.orderType || 'Dine-In',
            status: 'Confirmed',
            paymentStatus: data.paymentMethod ? 'Paid' : 'Pending',
            customerName: data.customerName ?? null,
            customerPhone: data.customerPhone ?? null,
            buyerKraPin: data.buyerKraPin ?? null,
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2),
            inventoryDeducted: false,
        }).returning();
        // 2. Automatically Occupy Table if Dine-In
        if (newOrder.orderType === 'Dine-In' && newOrder.tableId) {
            await tx.update(schema_1.restaurantTables)
                .set({
                status: 'Occupied',
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.id, newOrder.tableId), (0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId)));
        }
        // 3. Insert Order Items & Execute Recipe/BOM Stock Deductions
        for (const item of items) {
            const quantity = Number(item.quantity) || 1;
            const unitPrice = Number(item.price || item.unitPrice) || 0;
            const totalPrice = quantity * unitPrice;
            const menuItemId = parseInt(String(item.menuItemId || item.id), 10);
            await tx.insert(schema_1.orderItems).values({
                tenantId,
                orderId: newOrder.id,
                menuItemId: isNaN(menuItemId) ? 1 : menuItemId,
                quantity: quantity.toFixed(2),
                unitPrice: unitPrice.toFixed(2),
                totalPrice: totalPrice.toFixed(2),
            }).returning();
            // Find active recipe for this menu item to deduct underlying ingredients
            if (!isNaN(menuItemId)) {
                const [activeRecipe] = await tx.select().from(schema_1.recipes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.menuItemId, menuItemId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)));
                if (activeRecipe) {
                    const ingredients = await tx.select().from(schema_1.recipeIngredients).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.recipeId, activeRecipe.id)));
                    for (const ing of ingredients) {
                        const requiredQty = Number(ing.quantity) * quantity;
                        const [invItem] = await tx.select().from(schema_1.inventoryItems).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, ing.inventoryItemId))).for('update');
                        if (invItem) {
                            const currentStock = Number(invItem.currentStock);
                            const newStock = Number((currentStock - requiredQty).toFixed(4));
                            await tx.update(schema_1.inventoryItems).set({
                                currentStock: newStock.toFixed(4),
                                updatedAt: new Date(),
                            }).where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, invItem.id));
                            const qtyNum = -requiredQty;
                            const unitCostNum = Number(invItem.costPrice) || 0;
                            const totalValuationNum = Number((Math.abs(qtyNum) * unitCostNum).toFixed(4));
                            await tx.insert(schema_1.stockMovements).values({
                                tenantId,
                                inventoryItemId: invItem.id,
                                orderId: newOrder.id,
                                type: 'SALE_CONSUMPTION',
                                quantity: qtyNum.toFixed(4),
                                unitCost: unitCostNum.toFixed(4),
                                totalValuation: totalValuationNum.toFixed(4),
                                balanceAfter: newStock.toFixed(4),
                                notes: `Automatic recipe deduction for order ${orderNumber}`,
                            });
                        }
                    }
                }
            }
        }
        await tx.update(schema_1.orders).set({ inventoryDeducted: true }).where((0, drizzle_orm_1.eq)(schema_1.orders.id, newOrder.id));
        return newOrder;
    });
};
exports.createOrderRecord = createOrderRecord;
const fetchTenantOrders = async (tenantId) => {
    return await db_1.db.select().from(schema_1.orders).where((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)).orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
};
exports.fetchTenantOrders = fetchTenantOrders;
const fetchOpenOrders = async (tenantId) => {
    return await db_1.db.select().from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Preparing', 'Ready', 'Sent-To-Kitchen'])))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
};
exports.fetchOpenOrders = fetchOpenOrders;
const updateOrderStatus = async (tenantId, orderId, status) => {
    return await db_1.db.transaction(async (tx) => {
        const [updatedOrder] = await tx.update(schema_1.orders)
            .set({ status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        // Release table when order is fulfilled, completed, or cancelled
        if (updatedOrder && (status === 'Completed' || status === 'Cancelled') && updatedOrder.tableId) {
            await tx.update(schema_1.restaurantTables)
                .set({
                status: 'Cleaning',
                updatedAt: new Date()
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.id, updatedOrder.tableId), (0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId)));
        }
        return updatedOrder;
    });
};
exports.updateOrderStatus = updateOrderStatus;
const fetchTakeawayOrders = async (tenantId) => {
    return await db_1.db.select().from(schema_1.orders)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.orderType, 'Takeaway')))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
};
exports.fetchTakeawayOrders = fetchTakeawayOrders;
