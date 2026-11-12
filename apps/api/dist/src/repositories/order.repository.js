"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOnlineStorefrontOrders = exports.fetchTakeawayOrders = exports.updateOrderStatus = exports.fetchOpenOrders = exports.fetchOrderDetailById = exports.fetchTenantOrders = exports.createOrderRecord = void 0;
// apps/api/src/repositories/order.repository.ts
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const createOrderRecord = async (tenantId, data, items) => {
    return await db_1.db.transaction(async (tx) => {
        const orderNumber = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        const subtotal = Number(data.subtotal) ||
            items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
        const discountTotal = Number(data.discountTotal) || 0;
        const tax = Number(data.tax) || Number((subtotal * 0.16).toFixed(2));
        const cateringLevy = Number(data.cateringLevy) || 0;
        const serviceCharge = Number(data.serviceCharge) || 0;
        const total = Number(data.total) || subtotal + tax + cateringLevy + serviceCharge;
        const isPaid = Boolean(data.paymentMethod);
        // 1. Insert Order Header with full Branch & Cashier Custody Attribution
        const [newOrder] = await tx
            .insert(schema_1.orders)
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
                .update(schema_1.restaurantTables)
                .set({
                status: 'Occupied',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.id, newOrder.tableId), (0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId)));
        }
        // 3. Record Treasury Payment, KRA eTIMS Fiscal Invoice & Increment Active Cash Drawer / Shift Balances
        if (isPaid) {
            const normalizedMethod = String(data.paymentMethod || '').toUpperCase();
            const isCashTender = normalizedMethod === 'CASH' || normalizedMethod === 'SPLIT';
            const cashInflow = normalizedMethod === 'CASH'
                ? total
                : normalizedMethod === 'SPLIT'
                    ? Math.min(total, Number(data.cashTendered) || 0)
                    : 0;
            await tx.insert(schema_1.payments).values({
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
                autoFiscalize: schema_1.tenantFinancialSettings.autoFiscalizeOnPayment,
                deviceSerial: schema_1.tenantFinancialSettings.etimsDeviceSerial,
            })
                .from(schema_1.tenantFinancialSettings)
                .where((0, drizzle_orm_1.eq)(schema_1.tenantFinancialSettings.tenantId, tenantId))
                .limit(1);
            const shouldAutoSign = finSettings?.autoFiscalize !== false;
            const cuInvoiceNo = shouldAutoSign ? `KRA-CU-${Date.now().toString().slice(-8)}` : null;
            await tx.insert(schema_1.fiscalInvoices).values({
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
                    (0, drizzle_orm_1.eq)(schema_1.drawerSessions.tenantId, tenantId),
                    (0, drizzle_orm_1.sql) `${schema_1.drawerSessions.status} != 'CLOSED_RECONCILED'`,
                ];
                if (data.cashDrawerId) {
                    sessionFilters.push((0, drizzle_orm_1.eq)(schema_1.drawerSessions.drawerId, Number(data.cashDrawerId)));
                }
                else if (data.cashierId) {
                    sessionFilters.push((0, drizzle_orm_1.eq)(schema_1.drawerSessions.cashierId, Number(data.cashierId)));
                }
                const [activeSession] = await tx
                    .select()
                    .from(schema_1.drawerSessions)
                    .where((0, drizzle_orm_1.and)(...sessionFilters))
                    .orderBy((0, drizzle_orm_1.desc)(schema_1.drawerSessions.openedAt))
                    .limit(1);
                if (activeSession) {
                    const newSalesTotal = (Number(activeSession.cashSalesTotal) || 0) + cashInflow;
                    const newExpectedClosing = (Number(activeSession.expectedClosingBalance) || 0) + cashInflow;
                    await tx
                        .update(schema_1.drawerSessions)
                        .set({
                        cashSalesTotal: newSalesTotal.toFixed(4),
                        expectedClosingBalance: newExpectedClosing.toFixed(4),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.drawerSessions.id, activeSession.id));
                    await tx
                        .update(schema_1.cashDrawers)
                        .set({
                        currentBalance: newExpectedClosing.toFixed(2),
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.cashDrawers.id, activeSession.drawerId));
                }
                const shiftFilters = [
                    (0, drizzle_orm_1.eq)(schema_1.cashierShifts.tenantId, tenantId),
                    (0, drizzle_orm_1.eq)(schema_1.cashierShifts.status, 'OPEN'),
                ];
                if (data.cashierShiftId) {
                    shiftFilters.push((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, Number(data.cashierShiftId)));
                }
                else if (data.cashierId) {
                    shiftFilters.push((0, drizzle_orm_1.eq)(schema_1.cashierShifts.cashierId, Number(data.cashierId)));
                }
                const [openShift] = await tx
                    .select()
                    .from(schema_1.cashierShifts)
                    .where((0, drizzle_orm_1.and)(...shiftFilters))
                    .limit(1);
                if (openShift) {
                    const updatedExpected = (Number(openShift.expectedCash) || 0) + cashInflow;
                    await tx
                        .update(schema_1.cashierShifts)
                        .set({ expectedCash: updatedExpected.toFixed(2) })
                        .where((0, drizzle_orm_1.eq)(schema_1.cashierShifts.id, openShift.id));
                }
            }
            if (data.customerId && total >= 100) {
                const pointsEarned = Math.floor(total / 100);
                const [profile] = await tx
                    .select()
                    .from(schema_1.customerLoyaltyProfiles)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.customerId, Number(data.customerId))))
                    .limit(1);
                if (profile) {
                    const balBefore = profile.currentPoints;
                    const balAfter = balBefore + pointsEarned;
                    await tx
                        .update(schema_1.customerLoyaltyProfiles)
                        .set({
                        currentPoints: balAfter,
                        lifetimePointsEarned: profile.lifetimePointsEarned + pointsEarned,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.customerLoyaltyProfiles.id, profile.id));
                    await tx
                        .update(schema_1.customers)
                        .set({
                        loyaltyPoints: balAfter,
                        totalSpent: (0, drizzle_orm_1.sql) `${schema_1.customers.totalSpent} + ${total.toFixed(2)}`,
                        ordersCount: (0, drizzle_orm_1.sql) `${schema_1.customers.ordersCount} + 1`,
                        updatedAt: new Date(),
                    })
                        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, Number(data.customerId)));
                    await tx.insert(schema_1.loyaltyTransactionsLedger).values({
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
                .insert(schema_1.orderItems)
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
                    .from(schema_1.recipes)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.menuItemId, menuItemId), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)));
                if (activeRecipe) {
                    const ingredients = await tx
                        .select()
                        .from(schema_1.recipeIngredients)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.recipeId, activeRecipe.id)));
                    for (const ing of ingredients) {
                        const requiredQty = Number(ing.quantity) * quantity;
                        const [invItem] = await tx
                            .select()
                            .from(schema_1.inventoryItems)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, ing.inventoryItemId)))
                            .for('update');
                        if (invItem) {
                            const currentStock = Number(invItem.currentStock);
                            const newStock = Number((currentStock - requiredQty).toFixed(4));
                            await tx
                                .update(schema_1.inventoryItems)
                                .set({
                                currentStock: newStock.toFixed(4),
                                updatedAt: new Date(),
                            })
                                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, invItem.id));
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
const fetchTenantOrders = async (tenantId, query) => {
    const conditions = [(0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)];
    if (query?.branchId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.orders.branchId, query.branchId));
    }
    if (query?.status && query.status !== 'ALL') {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.orders.status, query.status));
    }
    if (query?.paymentStatus && query.paymentStatus !== 'ALL') {
        conditions.push((0, drizzle_orm_1.sql) `UPPER(${schema_1.orders.paymentStatus}) = UPPER(${query.paymentStatus})`);
    }
    if (query?.orderType && query.orderType !== 'ALL') {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.orders.orderType, query.orderType));
    }
    if (query?.cashierId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.orders.cashierId, query.cashierId));
    }
    if (query?.startDate) {
        conditions.push((0, drizzle_orm_1.gte)(schema_1.orders.createdAt, new Date(`${query.startDate}T00:00:00.000Z`)));
    }
    if (query?.endDate) {
        conditions.push((0, drizzle_orm_1.lte)(schema_1.orders.createdAt, new Date(`${query.endDate}T23:59:59.999Z`)));
    }
    if (query?.minAmount !== undefined) {
        conditions.push((0, drizzle_orm_1.sql) `CAST(${schema_1.orders.total} AS NUMERIC) >= ${query.minAmount}`);
    }
    if (query?.maxAmount !== undefined) {
        conditions.push((0, drizzle_orm_1.sql) `CAST(${schema_1.orders.total} AS NUMERIC) <= ${query.maxAmount}`);
    }
    if (query?.hasKraPin === 'true') {
        conditions.push((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNotNull)(schema_1.orders.buyerKraPin), (0, drizzle_orm_1.sql) `TRIM(${schema_1.orders.buyerKraPin}) != ''`));
    }
    if (query?.search) {
        const term = `%${query.search}%`;
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.orders.orderNumber, term), (0, drizzle_orm_1.ilike)(schema_1.orders.customerName, term), (0, drizzle_orm_1.ilike)(schema_1.orders.customerPhone, term), (0, drizzle_orm_1.ilike)(schema_1.orders.tableName, term), (0, drizzle_orm_1.ilike)(schema_1.orders.buyerKraPin, term)));
    }
    const rows = await db_1.db
        .select({
        id: schema_1.orders.id,
        branchId: schema_1.orders.branchId,
        branchName: schema_1.branches.name,
        cashierId: schema_1.orders.cashierId,
        cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        tableName: schema_1.orders.tableName,
        customerName: schema_1.orders.customerName,
        customerPhone: schema_1.orders.customerPhone,
        buyerKraPin: schema_1.orders.buyerKraPin,
        subtotal: schema_1.orders.subtotal,
        discountTotal: schema_1.orders.discountTotal,
        tax: schema_1.orders.tax,
        cateringLevy: schema_1.orders.cateringLevy,
        total: schema_1.orders.total,
        amountPaid: schema_1.orders.amountPaid,
        createdAt: schema_1.orders.createdAt,
        paymentMethod: (0, drizzle_orm_1.sql) `(SELECT p.payment_method FROM payments p WHERE p.order_id = ${schema_1.orders.id} ORDER BY p.id DESC LIMIT 1)`,
        cuInvoiceNumber: (0, drizzle_orm_1.sql) `(SELECT f.cu_invoice_number FROM fiscal_invoices f WHERE f.order_id = ${schema_1.orders.id} ORDER BY f.id DESC LIMIT 1)`,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
        .limit(query?.limit || 100);
    if (query?.paymentMethod && query.paymentMethod !== 'ALL') {
        return rows.filter((r) => (r.paymentMethod || '').toUpperCase() === query.paymentMethod.toUpperCase());
    }
    return rows;
};
exports.fetchTenantOrders = fetchTenantOrders;
const fetchOrderDetailById = async (tenantId, orderId) => {
    const [header] = await db_1.db
        .select({
        id: schema_1.orders.id,
        branchName: schema_1.branches.name,
        cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        tableName: schema_1.orders.tableName,
        customerName: schema_1.orders.customerName,
        customerPhone: schema_1.orders.customerPhone,
        buyerKraPin: schema_1.orders.buyerKraPin,
        subtotal: schema_1.orders.subtotal,
        discountTotal: schema_1.orders.discountTotal,
        tax: schema_1.orders.tax,
        cateringLevy: schema_1.orders.cateringLevy,
        serviceCharge: schema_1.orders.serviceCharge,
        total: schema_1.orders.total,
        amountPaid: schema_1.orders.amountPaid,
        notes: schema_1.orders.notes,
        createdAt: schema_1.orders.createdAt,
        paymentMethod: (0, drizzle_orm_1.sql) `(SELECT p.payment_method FROM payments p WHERE p.order_id = ${schema_1.orders.id} ORDER BY p.id DESC LIMIT 1)`,
        cuInvoiceNumber: (0, drizzle_orm_1.sql) `(SELECT f.cu_invoice_number FROM fiscal_invoices f WHERE f.order_id = ${schema_1.orders.id} ORDER BY f.id DESC LIMIT 1)`,
        fiscalStatus: (0, drizzle_orm_1.sql) `(SELECT f.fiscal_status FROM fiscal_invoices f WHERE f.order_id = ${schema_1.orders.id} ORDER BY f.id DESC LIMIT 1)`,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
        .limit(1);
    if (!header)
        return null;
    const lines = await db_1.db
        .select({
        id: schema_1.orderItems.id,
        menuItemId: schema_1.orderItems.menuItemId,
        itemName: schema_1.menuItems.name,
        sku: schema_1.menuItems.sku,
        quantity: schema_1.orderItems.quantity,
        unitPrice: schema_1.orderItems.unitPrice,
        totalPrice: schema_1.orderItems.totalPrice,
        notes: schema_1.orderItems.notes,
    })
        .from(schema_1.orderItems)
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)));
    return {
        ...header,
        items: lines,
    };
};
exports.fetchOrderDetailById = fetchOrderDetailById;
const fetchOpenOrders = async (tenantId, branchId) => {
    return await db_1.db
        .select({
        id: schema_1.orders.id,
        branchId: schema_1.orders.branchId,
        branchName: schema_1.branches.name,
        cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        tableName: schema_1.orders.tableName,
        customerName: schema_1.orders.customerName,
        customerPhone: schema_1.orders.customerPhone,
        total: schema_1.orders.total,
        createdAt: schema_1.orders.createdAt,
        itemsCount: (0, drizzle_orm_1.sql) `(SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int FROM order_items oi WHERE oi.order_id = ${schema_1.orders.id})`,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined, (0, drizzle_orm_1.inArray)(schema_1.orders.status, ['Confirmed', 'Preparing', 'Ready', 'Sent-To-Kitchen'])))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.orders.createdAt)); // Oldest active tickets first (FIFO kitchen queue)
};
exports.fetchOpenOrders = fetchOpenOrders;
const updateOrderStatus = async (tenantId, orderId, status) => {
    return await db_1.db.transaction(async (tx) => {
        const [updatedOrder] = await tx
            .update(schema_1.orders)
            .set({ status, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, orderId), (0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId)))
            .returning();
        if (updatedOrder && (status === 'Completed' || status === 'Cancelled') && updatedOrder.tableId) {
            await tx
                .update(schema_1.restaurantTables)
                .set({
                status: 'Cleaning',
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.id, updatedOrder.tableId), (0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, tenantId)));
        }
        return updatedOrder;
    });
};
exports.updateOrderStatus = updateOrderStatus;
const fetchTakeawayOrders = async (tenantId, branchId) => {
    return await db_1.db
        .select({
        id: schema_1.orders.id,
        branchId: schema_1.orders.branchId,
        branchName: schema_1.branches.name,
        cashierName: (0, drizzle_orm_1.sql) `TRIM(CONCAT(${schema_1.users.firstName}, ' ', ${schema_1.users.lastName}))`,
        orderNumber: schema_1.orders.orderNumber,
        orderType: schema_1.orders.orderType,
        status: schema_1.orders.status,
        paymentStatus: schema_1.orders.paymentStatus,
        customerName: schema_1.orders.customerName,
        customerPhone: schema_1.orders.customerPhone,
        buyerKraPin: schema_1.orders.buyerKraPin,
        subtotal: schema_1.orders.subtotal,
        tax: schema_1.orders.tax,
        total: schema_1.orders.total,
        createdAt: schema_1.orders.createdAt,
        itemsCount: (0, drizzle_orm_1.sql) `(SELECT COALESCE(SUM(CAST(oi.quantity AS NUMERIC)), 0)::int FROM order_items oi WHERE oi.order_id = ${schema_1.orders.id})`,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.orders.cashierId, schema_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Takeaway%'), (0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Express%'))))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt));
};
exports.fetchTakeawayOrders = fetchTakeawayOrders;
const fetchOnlineStorefrontOrders = async (tenantId, branchId) => {
    const activeOrders = await db_1.db
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
        buyerKraPin: schema_1.orders.buyerKraPin,
        subtotal: schema_1.orders.subtotal,
        tax: schema_1.orders.tax,
        total: schema_1.orders.total,
        notes: schema_1.orders.notes,
        createdAt: schema_1.orders.createdAt,
        paymentMethod: (0, drizzle_orm_1.sql) `(SELECT p.payment_method FROM payments p WHERE p.order_id = ${schema_1.orders.id} ORDER BY p.id DESC LIMIT 1)`,
    })
        .from(schema_1.orders)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.orders.branchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, tenantId), branchId ? (0, drizzle_orm_1.eq)(schema_1.orders.branchId, branchId) : undefined, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Online%'), (0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Web%'), (0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Delivery%'), (0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Takeaway%'), (0, drizzle_orm_1.ilike)(schema_1.orders.orderType, '%Express%')), (0, drizzle_orm_1.sql) `${schema_1.orders.status} NOT IN ('Completed', 'Cancelled')`))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.orders.createdAt));
    if (activeOrders.length === 0)
        return [];
    const orderIds = activeOrders.map((o) => o.id);
    const allLines = await db_1.db
        .select({
        id: schema_1.orderItems.id,
        orderId: schema_1.orderItems.orderId,
        quantity: schema_1.orderItems.quantity,
        unitPrice: schema_1.orderItems.unitPrice,
        totalPrice: schema_1.orderItems.totalPrice,
        name: schema_1.menuItems.name,
        notes: schema_1.orderItems.notes,
    })
        .from(schema_1.orderItems)
        .leftJoin(schema_1.menuItems, (0, drizzle_orm_1.eq)(schema_1.orderItems.menuItemId, schema_1.menuItems.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.tenantId, tenantId), (0, drizzle_orm_1.inArray)(schema_1.orderItems.orderId, orderIds)));
    const linesByOrderId = new Map();
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
exports.fetchOnlineStorefrontOrders = fetchOnlineStorefrontOrders;
