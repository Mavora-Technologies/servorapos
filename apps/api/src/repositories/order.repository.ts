// apps/api/src/repositories/order.repository.ts
import { eq, desc, and, inArray, sql, asc, or, ilike, gte, lte, isNotNull } from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  recipes,
  recipeIngredients,
  inventoryItems,
  stockMovements,
  restaurantTables,
  cashDrawers,
  drawerSessions,
  cashierShifts,
  payments,
  customers,
  customerLoyaltyProfiles,
  loyaltyTransactionsLedger,
  fiscalInvoices,
  tenantFinancialSettings,
  branches,
  users,
} from '../config/schema';
import { ListOrdersQuery } from '../validators/order.validator';

export const createOrderRecord = async (tenantId: number, data: any, items: any[]) => {
  return await db.transaction(async (tx) => {
    const orderNumber = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const subtotal =
      Number(data.subtotal) ||
      items.reduce((sum: number, i: any) => sum + Number(i.price) * Number(i.quantity), 0);
    const discountTotal = Number(data.discountTotal) || 0;
    const tax = Number(data.tax) || Number((subtotal * 0.16).toFixed(2));
    const cateringLevy = Number(data.cateringLevy) || 0;
    const serviceCharge = Number(data.serviceCharge) || 0;
    const total = Number(data.total) || subtotal + tax + cateringLevy + serviceCharge;
    const isPaid = Boolean(data.paymentMethod);

    // 1. Insert Order Header with full Branch & Cashier Custody Attribution
    const [newOrder] = await tx
      .insert(orders)
      .values({
        tenantId,
        branchId: data.branchId ?? null,
        cashierId: data.cashierId ?? null,
        tableId: data.tableId ?? null,
        tableName: data.tableName ?? data.orderType ?? 'Counter POS',
        orderNumber,
        orderType: data.orderType || 'Dine-In',
        status: 'Confirmed',
        paymentStatus: isPaid ? 'Paid' : 'Pending',
        customerName: data.customerName ?? null,
        customerPhone: data.customerPhone ?? null,
        buyerKraPin: data.buyerKraPin ?? null,
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        tax: tax.toFixed(2),
        cateringLevy: cateringLevy.toFixed(2),
        serviceCharge: serviceCharge.toFixed(2),
        total: total.toFixed(2),
        amountPaid: isPaid ? total.toFixed(2) : '0.00',
        inventoryDeducted: false,
      })
      .returning();

    // 2. Automatically Occupy Table if Dine-In
    if (newOrder.orderType === 'Dine-In' && newOrder.tableId) {
      await tx
        .update(restaurantTables)
        .set({
          status: 'Occupied',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(restaurantTables.id, newOrder.tableId),
            eq(restaurantTables.tenantId, tenantId)
          )
        );
    }

    // 3. Record Treasury Payment, KRA eTIMS Fiscal Invoice & Increment Active Cash Drawer / Shift Balances
    if (isPaid) {
      const normalizedMethod = String(data.paymentMethod || '').toUpperCase();
      const isCashTender = normalizedMethod === 'CASH' || normalizedMethod === 'SPLIT';

      const cashInflow =
        normalizedMethod === 'CASH'
          ? total
          : normalizedMethod === 'SPLIT'
          ? Math.min(total, Number(data.cashTendered) || 0)
          : 0;

      await tx.insert(payments).values({
        tenantId,
        branchId: data.branchId ?? null,
        paymentNumber: `PMT-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`,
        paymentFlow: 'INBOUND_AR',
        status: 'POSTED',
        paymentMethod: isCashTender
          ? 'CASH_DRAWER'
          : normalizedMethod === 'M-PESA'
          ? 'MPESA_B2B'
          : 'CREDIT_CARD',
        clearingAccount: isCashTender ? 'POS Cash Drawer Register' : `${data.paymentMethod} Clearing`,
        transactionReference: orderNumber,
        orderId: newOrder.id,
        currency: 'KES',
        amount: total.toFixed(4),
        processedById: data.cashierId ?? null,
        notes: `POS Settlement for ${orderNumber}`,
      });

      const [finSettings] = await tx
        .select({
          autoFiscalize: tenantFinancialSettings.autoFiscalizeOnPayment,
          deviceSerial: tenantFinancialSettings.etimsDeviceSerial,
        })
        .from(tenantFinancialSettings)
        .where(eq(tenantFinancialSettings.tenantId, tenantId))
        .limit(1);

      const shouldAutoSign = finSettings?.autoFiscalize !== false;
      const cuInvoiceNo = shouldAutoSign ? `KRA-CU-${Date.now().toString().slice(-8)}` : null;

      await tx.insert(fiscalInvoices).values({
        tenantId,
        branchId: data.branchId ?? null,
        orderId: newOrder.id,
        invoiceType: 'SALE',
        buyerKraPin: data.buyerKraPin ?? null,
        cuInvoiceNumber: cuInvoiceNo,
        sdcId: finSettings?.deviceSerial || 'OSCU-SCU-2026-NBO',
        fiscalStatus: shouldAutoSign ? 'FISCALIZED' : 'PENDING',
        fiscalizedAt: shouldAutoSign ? new Date() : null,
      });

      if (isCashTender && cashInflow > 0) {
        const sessionFilters = [
          eq(drawerSessions.tenantId, tenantId),
          sql`${drawerSessions.status} != 'CLOSED_RECONCILED'`,
        ];
        if (data.cashDrawerId) {
          sessionFilters.push(eq(drawerSessions.drawerId, Number(data.cashDrawerId)));
        } else if (data.cashierId) {
          sessionFilters.push(eq(drawerSessions.cashierId, Number(data.cashierId)));
        }

        const [activeSession] = await tx
          .select()
          .from(drawerSessions)
          .where(and(...sessionFilters))
          .orderBy(desc(drawerSessions.openedAt))
          .limit(1);

        if (activeSession) {
          const newSalesTotal = (Number(activeSession.cashSalesTotal) || 0) + cashInflow;
          const newExpectedClosing = (Number(activeSession.expectedClosingBalance) || 0) + cashInflow;

          await tx
            .update(drawerSessions)
            .set({
              cashSalesTotal: newSalesTotal.toFixed(4),
              expectedClosingBalance: newExpectedClosing.toFixed(4),
            })
            .where(eq(drawerSessions.id, activeSession.id));

          await tx
            .update(cashDrawers)
            .set({
              currentBalance: newExpectedClosing.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(cashDrawers.id, activeSession.drawerId));
        }

        const shiftFilters = [
          eq(cashierShifts.tenantId, tenantId),
          eq(cashierShifts.status, 'OPEN'),
        ];
        if (data.cashierShiftId) {
          shiftFilters.push(eq(cashierShifts.id, Number(data.cashierShiftId)));
        } else if (data.cashierId) {
          shiftFilters.push(eq(cashierShifts.cashierId, Number(data.cashierId)));
        }

        const [openShift] = await tx
          .select()
          .from(cashierShifts)
          .where(and(...shiftFilters))
          .limit(1);

        if (openShift) {
          const updatedExpected = (Number(openShift.expectedCash) || 0) + cashInflow;
          await tx
            .update(cashierShifts)
            .set({ expectedCash: updatedExpected.toFixed(2) })
            .where(eq(cashierShifts.id, openShift.id));
        }
      }

      if (data.customerId && total >= 100) {
        const pointsEarned = Math.floor(total / 100);
        const [profile] = await tx
          .select()
          .from(customerLoyaltyProfiles)
          .where(
            and(
              eq(customerLoyaltyProfiles.tenantId, tenantId),
              eq(customerLoyaltyProfiles.customerId, Number(data.customerId))
            )
          )
          .limit(1);

        if (profile) {
          const balBefore = profile.currentPoints;
          const balAfter = balBefore + pointsEarned;

          await tx
            .update(customerLoyaltyProfiles)
            .set({
              currentPoints: balAfter,
              lifetimePointsEarned: profile.lifetimePointsEarned + pointsEarned,
              updatedAt: new Date(),
            })
            .where(eq(customerLoyaltyProfiles.id, profile.id));

          await tx
            .update(customers)
            .set({
              loyaltyPoints: balAfter,
              totalSpent: sql`${customers.totalSpent} + ${total.toFixed(2)}`,
              ordersCount: sql`${customers.ordersCount} + 1`,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, Number(data.customerId)));

          await tx.insert(loyaltyTransactionsLedger).values({
            tenantId,
            branchId: data.branchId ?? null,
            customerId: Number(data.customerId),
            orderId: newOrder.id,
            entryType: 'ACCRUAL_PURCHASE',
            pointsDelta: pointsEarned,
            monetaryValueKes: total.toFixed(2),
            balanceBefore: balBefore,
            balanceAfter: balAfter,
            channel: 'POS_TERMINAL',
            auditReference: orderNumber,
            notes: `POS Purchase Accrual (${orderNumber})`,
            processedById: data.cashierId ?? null,
          });
        }
      }
    }

    // 4. Insert Order Items & Execute Recipe/BOM Stock Deductions
    for (const item of items) {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.price || item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;
      const menuItemId = parseInt(String(item.menuItemId || item.id), 10);

      await tx
        .insert(orderItems)
        .values({
          tenantId,
          orderId: newOrder.id,
          menuItemId: isNaN(menuItemId) ? 1 : menuItemId,
          quantity: quantity.toFixed(2),
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        })
        .returning();

      if (!isNaN(menuItemId)) {
        const [activeRecipe] = await tx
          .select()
          .from(recipes)
          .where(
            and(
              eq(recipes.tenantId, tenantId),
              eq(recipes.menuItemId, menuItemId),
              eq(recipes.isActive, true)
            )
          );

        if (activeRecipe) {
          const ingredients = await tx
            .select()
            .from(recipeIngredients)
            .where(
              and(
                eq(recipeIngredients.tenantId, tenantId),
                eq(recipeIngredients.recipeId, activeRecipe.id)
              )
            );

          for (const ing of ingredients) {
            const requiredQty = Number(ing.quantity) * quantity;

            const [invItem] = await tx
              .select()
              .from(inventoryItems)
              .where(
                and(
                  eq(inventoryItems.tenantId, tenantId),
                  eq(inventoryItems.id, ing.inventoryItemId)
                )
              )
              .for('update');

            if (invItem) {
              const currentStock = Number(invItem.currentStock);
              const newStock = Number((currentStock - requiredQty).toFixed(4));

              await tx
                .update(inventoryItems)
                .set({
                  currentStock: newStock.toFixed(4),
                  updatedAt: new Date(),
                })
                .where(eq(inventoryItems.id, invItem.id));

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

export const fetchTenantOrders = async (tenantId: number, query?: ListOrdersQuery) => {
  const conditions = [eq(orders.tenantId, tenantId)];

  if (query?.branchId) {
    conditions.push(eq(orders.branchId, query.branchId));
  }
  if (query?.status && query.status !== 'ALL') {
    conditions.push(eq(orders.status, query.status));
  }
  if (query?.paymentStatus && query.paymentStatus !== 'ALL') {
    conditions.push(sql`UPPER(${orders.paymentStatus}) = UPPER(${query.paymentStatus})`);
  }
  if (query?.orderType && query.orderType !== 'ALL') {
    conditions.push(eq(orders.orderType, query.orderType));
  }
  if (query?.cashierId) {
    conditions.push(eq(orders.cashierId, query.cashierId));
  }
  if (query?.startDate) {
    conditions.push(gte(orders.createdAt, new Date(`${query.startDate}T00:00:00.000Z`)));
  }
  if (query?.endDate) {
    conditions.push(lte(orders.createdAt, new Date(`${query.endDate}T23:59:59.999Z`)));
  }
  if (query?.minAmount !== undefined) {
    conditions.push(sql`CAST(${orders.total} AS NUMERIC) >= ${query.minAmount}`);
  }
  if (query?.maxAmount !== undefined) {
    conditions.push(sql`CAST(${orders.total} AS NUMERIC) <= ${query.maxAmount}`);
  }
  if (query?.hasKraPin === 'true') {
    conditions.push(and(isNotNull(orders.buyerKraPin), sql`TRIM(${orders.buyerKraPin}) != ''`)!);
  }
  if (query?.search) {
    const term = `%${query.search}%`;
    conditions.push(
      or(
        ilike(orders.orderNumber, term),
        ilike(orders.customerName, term),
        ilike(orders.customerPhone, term),
        ilike(orders.tableName, term),
        ilike(orders.buyerKraPin, term)
      )!
    );
  }

  const rows = await db
    .select({
      id: orders.id,
      branchId: orders.branchId,
      branchName: branches.name,
      cashierId: orders.cashierId,
      cashierName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      tableName: orders.tableName,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      buyerKraPin: orders.buyerKraPin,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      tax: orders.tax,
      cateringLevy: orders.cateringLevy,
      total: orders.total,
      amountPaid: orders.amountPaid,
      createdAt: orders.createdAt,
      paymentMethod: sql<string | null>`(SELECT p.payment_method FROM payments p WHERE p.order_id = ${orders.id} ORDER BY p.id DESC LIMIT 1)`,
      cuInvoiceNumber: sql<string | null>`(SELECT f.cu_invoice_number FROM fiscal_invoices f WHERE f.order_id = ${orders.id} ORDER BY f.id DESC LIMIT 1)`,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(users, eq(orders.cashierId, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(query?.limit || 100);

  if (query?.paymentMethod && query.paymentMethod !== 'ALL') {
    return rows.filter(
      (r) => (r.paymentMethod || '').toUpperCase() === query.paymentMethod!.toUpperCase()
    );
  }

  return rows;
};

export const fetchOrderDetailById = async (tenantId: number, orderId: number) => {
  const [header] = await db
    .select({
      id: orders.id,
      branchName: branches.name,
      cashierName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      tableName: orders.tableName,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      buyerKraPin: orders.buyerKraPin,
      subtotal: orders.subtotal,
      discountTotal: orders.discountTotal,
      tax: orders.tax,
      cateringLevy: orders.cateringLevy,
      serviceCharge: orders.serviceCharge,
      total: orders.total,
      amountPaid: orders.amountPaid,
      notes: orders.notes,
      createdAt: orders.createdAt,
      paymentMethod: sql<string | null>`(SELECT p.payment_method FROM payments p WHERE p.order_id = ${orders.id} ORDER BY p.id DESC LIMIT 1)`,
      cuInvoiceNumber: sql<string | null>`(SELECT f.cu_invoice_number FROM fiscal_invoices f WHERE f.order_id = ${orders.id} ORDER BY f.id DESC LIMIT 1)`,
      fiscalStatus: sql<string | null>`(SELECT f.fiscal_status FROM fiscal_invoices f WHERE f.order_id = ${orders.id} ORDER BY f.id DESC LIMIT 1)`,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(users, eq(orders.cashierId, users.id))
    .where(and(eq(orders.tenantId, tenantId), eq(orders.id, orderId)))
    .limit(1);

  if (!header) return null;

  const lines = await db
    .select({
      id: orderItems.id,
      menuItemId: orderItems.menuItemId,
      itemName: menuItems.name,
      sku: menuItems.sku,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      notes: orderItems.notes,
    })
    .from(orderItems)
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(and(eq(orderItems.tenantId, tenantId), eq(orderItems.orderId, orderId)));

  return {
    ...header,
    items: lines,
  };
};

export const fetchOpenOrders = async (tenantId: number, branchId?: number) => {
  return await db
    .select({
      id: orders.id,
      branchId: orders.branchId,
      branchName: branches.name,
      cashierName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      tableName: orders.tableName,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      total: orders.total,
      createdAt: orders.createdAt,
      itemsCount: sql<number>`(SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int FROM order_items oi WHERE oi.order_id = ${orders.id})`,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(users, eq(orders.cashierId, users.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined,
        inArray(orders.status, ['Confirmed', 'Preparing', 'Ready', 'Sent-To-Kitchen'])
      )
    )
    .orderBy(asc(orders.createdAt)); // Oldest active tickets first (FIFO kitchen queue)
};

export const updateOrderStatus = async (tenantId: number, orderId: number, status: string) => {
  return await db.transaction(async (tx) => {
    const [updatedOrder] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .returning();

    if (updatedOrder && (status === 'Completed' || status === 'Cancelled') && updatedOrder.tableId) {
      await tx
        .update(restaurantTables)
        .set({
          status: 'Cleaning',
          updatedAt: new Date(),
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

export const fetchTakeawayOrders = async (tenantId: number, branchId?: number) => {
  return await db
    .select({
      id: orders.id,
      branchId: orders.branchId,
      branchName: branches.name,
      cashierName: sql<string | null>`TRIM(CONCAT(${users.firstName}, ' ', ${users.lastName}))`,
      orderNumber: orders.orderNumber,
      orderType: orders.orderType,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      customerName: orders.customerName,
      customerPhone: orders.customerPhone,
      buyerKraPin: orders.buyerKraPin,
      subtotal: orders.subtotal,
      tax: orders.tax,
      total: orders.total,
      createdAt: orders.createdAt,
      itemsCount: sql<number>`(SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int FROM order_items oi WHERE oi.order_id = ${orders.id})`,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .leftJoin(users, eq(orders.cashierId, users.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined,
        or(
          ilike(orders.orderType, '%Takeaway%'),
          ilike(orders.orderType, '%Express%')
        )
      )
    )
    .orderBy(desc(orders.createdAt));
};

export const fetchOnlineStorefrontOrders = async (tenantId: number, branchId?: number) => {
  const activeOrders = await db
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
      buyerKraPin: orders.buyerKraPin,
      subtotal: orders.subtotal,
      tax: orders.tax,
      total: orders.total,
      notes: orders.notes,
      createdAt: orders.createdAt,
      paymentMethod: sql<string | null>`(SELECT p.payment_method FROM payments p WHERE p.order_id = ${orders.id} ORDER BY p.id DESC LIMIT 1)`,
    })
    .from(orders)
    .leftJoin(branches, eq(orders.branchId, branches.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        branchId ? eq(orders.branchId, branchId) : undefined,
        or(
          ilike(orders.orderType, '%Online%'),
          ilike(orders.orderType, '%Web%'),
          ilike(orders.orderType, '%Delivery%'),
          ilike(orders.orderType, '%Takeaway%'),
          ilike(orders.orderType, '%Express%')
        ),
        sql`${orders.status} NOT IN ('Completed', 'Cancelled')`
      )
    )
    .orderBy(asc(orders.createdAt));

  if (activeOrders.length === 0) return [];

  const orderIds = activeOrders.map((o) => o.id);
  const allLines = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      name: menuItems.name,
      notes: orderItems.notes,
    })
    .from(orderItems)
    .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, orderIds)));

  const linesByOrderId = new Map<number, typeof allLines>();
  for (const line of allLines) {
    const existing = linesByOrderId.get(line.orderId) || [];
    existing.push(line);
    linesByOrderId.set(line.orderId, existing);
  }

  return activeOrders.map((o) => ({
    ...o,
    items: (linesByOrderId.get(o.id) || []).map((l) => ({
      id: l.id,
      quantity: Number(l.quantity),
      name: l.name || 'Menu Item',
      unitPrice: l.unitPrice,
      totalPrice: l.totalPrice,
      notes: l.notes,
    })),
  }));
};