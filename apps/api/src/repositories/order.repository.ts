// apps/api/src/repositories/order.repository.ts
import {
  eq,
  desc,
  and,
  inArray,
  sql,
  asc,
  or,
  ilike,
  gte,
  lte,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import { db } from '../config/db';
import {
  orders,
  orderItems,
  menuItems,
  menuCategories,
  kitchenStations,
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
  auditLogs,
} from '../config/schema';
import { ListOrdersQuery } from '../validators/order.validator';

export class RegisterClosedError extends Error {
  public readonly statusCode = 409;
  public readonly code = 'REGISTER_CLOSED';

  constructor(message: string) {
    super(message);
    this.name = 'RegisterClosedError';
  }
}

export const createOrderRecord = async (tenantId: number, data: any, items: any[]) => {
  return await db.transaction(async (tx) => {
    // 0. Idempotency Guard (prevents duplicate orders on network/offline retries)
    if (data.idempotencyKey) {
      const [existingOrder] = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.tenantId, tenantId),
            eq(orders.idempotencyKey, String(data.idempotencyKey))
          )
        )
        .limit(1);

      if (existingOrder) {
        return {
          ...existingOrder,
          stationRouting: [],
          isIdempotentReplay: true,
        };
      }
    }

    const branchIdNum = data.branchId ? Number(data.branchId) : null;
    const requestedDrawerId = data.cashDrawerId ? Number(data.cashDrawerId) : null;
    const requestedShiftId = data.cashierShiftId ? Number(data.cashierShiftId) : null;

    // 1. Server-Side 409 Conflict Closed-Register Guard (Enterprise POS Custody Rule)
    // Enforced for all POS orders; only bypassed if explicitly flagged as an external storefront webhook.
    let activeDrawerSession: {
      sessionId: number;
      drawerId: number;
      drawerName: string;
    } | null = null;
    let activeOpenShift: {
      id: number;
      branchId: number | null;
      cashierId: number;
    } | null = null;

    if (data.isExternalStorefront !== true) {
      const drawerScope = requestedDrawerId
        ? eq(cashDrawers.id, requestedDrawerId)
        : branchIdNum
          ? or(eq(cashDrawers.branchId, branchIdNum), isNull(cashDrawers.branchId))
          : undefined;

      const shiftScope = requestedShiftId
        ? eq(cashierShifts.id, requestedShiftId)
        : branchIdNum
          ? eq(cashierShifts.branchId, branchIdNum)
          : undefined;

      const [[drawerRow], [shiftRow]] = await Promise.all([
        tx
          .select({
            drawerId: cashDrawers.id,
            drawerName: cashDrawers.name,
            drawerStatus: cashDrawers.status,
            sessionId: drawerSessions.id,
          })
          .from(cashDrawers)
          .innerJoin(
            drawerSessions,
            and(
              eq(drawerSessions.drawerId, cashDrawers.id),
              eq(drawerSessions.tenantId, tenantId),
              sql`${drawerSessions.status} != 'CLOSED_RECONCILED'`
            )
          )
          .where(
            and(
              eq(cashDrawers.tenantId, tenantId),
              eq(cashDrawers.status, 'OPEN'),
              drawerScope
            )
          )
          .orderBy(desc(drawerSessions.openedAt))
          .limit(1),

        tx
          .select({
            id: cashierShifts.id,
            branchId: cashierShifts.branchId,
            cashierId: cashierShifts.cashierId,
          })
          .from(cashierShifts)
          .where(
            and(
              eq(cashierShifts.tenantId, tenantId),
              eq(cashierShifts.status, 'OPEN'),
              shiftScope
            )
          )
          .orderBy(desc(cashierShifts.openedAt))
          .limit(1),
      ]);

      if (!drawerRow || !drawerRow.sessionId) {
        throw new RegisterClosedError(
          'Cannot complete POS sale: no open cash drawer session is active for this outlet. A supervisor or cashier must open a shift float first.'
        );
      }

      if (!shiftRow) {
        throw new RegisterClosedError(
          'Cannot complete POS sale: no open cashier shift exists for this outlet. A supervisor or cashier must open a shift float first.'
        );
      }

      activeDrawerSession = {
        sessionId: drawerRow.sessionId,
        drawerId: drawerRow.drawerId,
        drawerName: drawerRow.drawerName,
      };
      activeOpenShift = shiftRow;
    }

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

    // 2. Insert Order Header with full Branch, Waiter, Cashier, Customer & Idempotency Attribution
    const [newOrder] = await tx
      .insert(orders)
      .values({
        tenantId,
        branchId: branchIdNum,
        waiterId: data.waiterId ? Number(data.waiterId) : data.cashierId ? Number(data.cashierId) : null,
        cashierId: data.cashierId ? Number(data.cashierId) : null,
        customerId: data.customerId ? Number(data.customerId) : null,
        tableId: data.tableId ? Number(data.tableId) : null,
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
        notes: data.notes ?? null,
        idempotencyKey: data.idempotencyKey ? String(data.idempotencyKey) : null,
        inventoryDeducted: false,
      })
      .returning();

    // 3. Automatically Occupy Table if Dine-In
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

    // 4. Record Treasury Payment, KRA eTIMS Fiscal Invoice & Atomically Increment Active Drawer / Shift Balances
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
        branchId: branchIdNum,
        paymentNumber: `PMT-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`,
        paymentFlow: 'INBOUND_AR',
        status: 'POSTED',
        paymentMethod: isCashTender
          ? 'CASH_DRAWER'
          : normalizedMethod === 'M-PESA'
            ? 'MPESA_B2B'
            : 'CREDIT_CARD',
        clearingAccount: isCashTender
          ? activeDrawerSession?.drawerName || 'POS Cash Drawer Register'
          : `${data.paymentMethod} Clearing`,
        transactionReference: orderNumber,
        orderId: newOrder.id,
        currency: 'KES',
        amount: total.toFixed(4),
        processedById: data.cashierId ? Number(data.cashierId) : null,
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
        branchId: branchIdNum,
        orderId: newOrder.id,
        invoiceType: 'SALE',
        buyerKraPin: data.buyerKraPin ?? null,
        cuInvoiceNumber: cuInvoiceNo,
        sdcId: finSettings?.deviceSerial || 'OSCU-SCU-2026-NBO',
        fiscalStatus: shouldAutoSign ? 'FISCALIZED' : 'PENDING',
        fiscalizedAt: shouldAutoSign ? new Date() : null,
      });

      if (isCashTender && cashInflow > 0) {
        const inflow4 = cashInflow.toFixed(4);
        const inflow2 = cashInflow.toFixed(2);

        if (activeDrawerSession) {
          await tx
            .update(drawerSessions)
            .set({
              cashSalesTotal: sql`${drawerSessions.cashSalesTotal} + ${inflow4}::numeric`,
              expectedClosingBalance: sql`${drawerSessions.expectedClosingBalance} + ${inflow4}::numeric`,
            })
            .where(eq(drawerSessions.id, activeDrawerSession.sessionId));

          await tx
            .update(cashDrawers)
            .set({
              currentBalance: sql`${cashDrawers.currentBalance} + ${inflow2}::numeric`,
              updatedAt: new Date(),
            })
            .where(eq(cashDrawers.id, activeDrawerSession.drawerId));
        }

        if (activeOpenShift) {
          await tx
            .update(cashierShifts)
            .set({
              expectedCash: sql`${cashierShifts.expectedCash} + ${inflow2}::numeric`,
            })
            .where(eq(cashierShifts.id, activeOpenShift.id));
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
            branchId: branchIdNum,
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
            processedById: data.cashierId ? Number(data.cashierId) : null,
          });
        }
      }
    }

    // 5. Resolve Station Routing (Order Override -> Line Override -> Branch Category Routing -> Menu Item Station + Failover)
    const [branchStations, catalogItems] = await Promise.all([
      tx
        .select()
        .from(kitchenStations)
        .where(
          and(
            eq(kitchenStations.tenantId, tenantId),
            branchIdNum ? eq(kitchenStations.branchId, branchIdNum) : undefined
          )
        ),
      tx
        .select({
          id: menuItems.id,
          name: menuItems.name,
          kitchenStation: menuItems.kitchenStation,
          categoryName: menuCategories.name,
        })
        .from(menuItems)
        .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
        .where(eq(menuItems.tenantId, tenantId)),
    ]);

    const stationById = new Map(branchStations.map((s) => [s.id, s]));
    const catalogById = new Map(catalogItems.map((m) => [m.id, m]));

    const applyFailover = (stationName: string) => {
      const matched = branchStations.find(
        (s) => s.name.trim().toLowerCase() === stationName.trim().toLowerCase()
      );
      if (matched && !matched.isActive && matched.backupStationId) {
        const backup = stationById.get(matched.backupStationId);
        if (backup && backup.isActive) {
          return {
            resolvedName: backup.name,
            stationCode: backup.code,
            wasFailover: true,
          };
        }
      }
      return {
        resolvedName: matched ? matched.name : stationName,
        stationCode: matched?.code || null,
        wasFailover: false,
      };
    };

    const stationRoutingManifest: Array<{
      itemName: string;
      quantity: number;
      routedStation: string;
      stationCode: string | null;
      wasRedirected: boolean;
      wasFailover: boolean;
    }> = [];

    // 6. Insert Order Items with Station Routing Tag & Execute Recipe/BOM Stock Deductions
    for (const item of items) {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = Number(item.price || item.unitPrice) || 0;
      const totalPrice = quantity * unitPrice;
      const menuItemId = parseInt(String(item.menuItemId || item.id), 10);
      const catalogEntry = !isNaN(menuItemId) ? catalogById.get(menuItemId) : undefined;

      let defaultStation = catalogEntry?.kitchenStation || 'Main Kitchen';
      if (catalogEntry?.categoryName) {
        const catLower = catalogEntry.categoryName.trim().toLowerCase();
        const catStation = branchStations.find((st) =>
          (st.assignedCategories || []).some((c) => c.trim().toLowerCase() === catLower)
        );
        if (catStation) defaultStation = catStation.name;
      }

      const requestedStation =
        (data.targetStation && String(data.targetStation).trim()) ||
        (item.targetStation && String(item.targetStation).trim()) ||
        defaultStation;

      const { resolvedName, stationCode, wasFailover } = applyFailover(requestedStation);
      const wasRedirected =
        resolvedName.trim().toLowerCase() !== defaultStation.trim().toLowerCase();

      const cleanPrepNote = item.notes ? String(item.notes).trim() : '';
      const encodedNotes = `[STATION:${resolvedName}]${cleanPrepNote ? ` ${cleanPrepNote}` : ''}`;

      stationRoutingManifest.push({
        itemName: item.name || catalogEntry?.name || `Item #${menuItemId}`,
        quantity,
        routedStation: resolvedName,
        stationCode,
        wasRedirected,
        wasFailover,
      });

      await tx
        .insert(orderItems)
        .values({
          tenantId,
          orderId: newOrder.id,
          menuItemId: isNaN(menuItemId) ? 1 : menuItemId,
          quantity: quantity.toFixed(2),
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
          kitchenStatus: 'New',
          notes: encodedNotes,
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
                branchId: branchIdNum ?? invItem.branchId ?? null,
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

    await tx.insert(auditLogs).values({
      tenantId,
      branchId: branchIdNum,
      userId: data.cashierId ? Number(data.cashierId) : null,
      action: 'POS_ORDER_ROUTED_TO_STATIONS',
      module: 'POS',
      entityType: 'orders',
      entityId: String(newOrder.id),
      reason: `Order ${orderNumber} routed across ${Array.from(
        new Set(stationRoutingManifest.map((r) => r.routedStation))
      ).join(', ')}`,
      newValues: {
        orderNumber,
        drawerSessionId: activeDrawerSession?.sessionId ?? null,
        cashierShiftId: activeOpenShift?.id ?? null,
        stationRoutingManifest,
      },
    });

    return {
      ...newOrder,
      stationRouting: stationRoutingManifest,
    };
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
      routedStation: sql<string | null>`NULLIF(SUBSTRING(${orderItems.notes} FROM '\\[STATION:([^\\]]+)\\]'), '')`,
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
    .orderBy(asc(orders.createdAt));
};

export const updateOrderStatus = async (
  tenantId: number,
  orderId: number,
  status: string,
  userId: number | null = null
) => {
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

    if (updatedOrder) {
      await tx.insert(auditLogs).values({
        tenantId,
        branchId: updatedOrder.branchId ?? null,
        userId,
        action: `ORDER_STATUS_${status.toUpperCase()}`,
        module: 'POS',
        entityType: 'orders',
        entityId: String(orderId),
        reason: `Order ${updatedOrder.orderNumber} updated to ${status}`,
      });
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