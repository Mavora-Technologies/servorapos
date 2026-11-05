// apps/api/src/repositories/order.repository.ts
import { eq, desc, and, inArray } from 'drizzle-orm';
import { db } from '../config/db';
import { 
  orders, 
  orderItems, 
  recipes, 
  recipeIngredients, 
  inventoryItems, 
  stockMovements, 
  restaurantTables 
} from '../config/schema';

export const createOrderRecord = async (tenantId: number, data: any, items: any[]) => {
  return await db.transaction(async (tx) => {
    const orderNumber = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const subtotal = Number(data.subtotal) || items.reduce((sum: number, i: any) => sum + (Number(i.price) * Number(i.quantity)), 0);
    const tax = Number(data.tax) || Number((subtotal * 0.16).toFixed(2));
    const total = Number(data.total) || (subtotal + tax);

    // 1. Insert Order Header
    const [newOrder] = await tx.insert(orders).values({
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
      await tx.update(restaurantTables)
        .set({ 
          status: 'Occupied', 
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(restaurantTables.id, newOrder.tableId),
            eq(restaurantTables.tenantId, tenantId)
          )
        );
    }

    // 3. Insert Order Items & Execute Recipe/BOM Stock Deductions
    for (const item of items) {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.price || item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;
      const menuItemId = parseInt(String(item.menuItemId || item.id), 10);

      await tx.insert(orderItems).values({
        tenantId,
        orderId: newOrder.id,
        menuItemId: isNaN(menuItemId) ? 1 : menuItemId,
        quantity: quantity.toFixed(2),
        unitPrice: unitPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
      }).returning();

      // Find active recipe for this menu item to deduct underlying ingredients
      if (!isNaN(menuItemId)) {
        const [activeRecipe] = await tx.select().from(recipes).where(
          and(
            eq(recipes.tenantId, tenantId),
            eq(recipes.menuItemId, menuItemId),
            eq(recipes.isActive, true)
          )
        );

        if (activeRecipe) {
          const ingredients = await tx.select().from(recipeIngredients).where(
            and(
              eq(recipeIngredients.tenantId, tenantId),
              eq(recipeIngredients.recipeId, activeRecipe.id)
            )
          );

          for (const ing of ingredients) {
            const requiredQty = Number(ing.quantity) * quantity;

            const [invItem] = await tx.select().from(inventoryItems).where(
              and(
                eq(inventoryItems.tenantId, tenantId),
                eq(inventoryItems.id, ing.inventoryItemId)
              )
            ).for('update');

            if (invItem) {
              const currentStock = Number(invItem.currentStock);
              const newStock = Number((currentStock - requiredQty).toFixed(4));

              await tx.update(inventoryItems).set({
                currentStock: newStock.toFixed(4),
                updatedAt: new Date(),
              }).where(eq(inventoryItems.id, invItem.id));

              const qtyNum = -requiredQty;
              const unitCostNum = Number(invItem.costPrice) || 0;
              const totalValuationNum = Number((Math.abs(qtyNum) * unitCostNum).toFixed(4));

              await tx.insert(stockMovements).values({
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

    await tx.update(orders).set({ inventoryDeducted: true }).where(eq(orders.id, newOrder.id));

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
        inArray(orders.status, ['Confirmed', 'Preparing', 'Ready', 'Sent-To-Kitchen'])
      )
    )
    .orderBy(desc(orders.createdAt));
};

export const updateOrderStatus = async (tenantId: number, orderId: number, status: string) => {
  return await db.transaction(async (tx) => {
    const [updatedOrder] = await tx.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();

    // Release table when order is fulfilled, completed, or cancelled
    if (updatedOrder && (status === 'Completed' || status === 'Cancelled') && updatedOrder.tableId) {
      await tx.update(restaurantTables)
        .set({ 
          status: 'Cleaning', 
          updatedAt: new Date() 
        })
        .where(
          and(
            eq(restaurantTables.id, updatedOrder.tableId),
            eq(restaurantTables.tenantId, tenantId)
          )
        );
    }

    return updatedOrder;
  });
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