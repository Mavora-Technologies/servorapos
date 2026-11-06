"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
// ============================================================================
// UNIT CONVERSION HELPER (Section 14 & 16: kg <-> g, L <-> ml)
// ============================================================================
function convertToInventoryBaseUnit(recipeQty, recipeUnit, inventoryBaseUnit) {
    const from = recipeUnit.trim().toLowerCase();
    const to = inventoryBaseUnit.trim().toLowerCase();
    if (from === to)
        return recipeQty;
    const normalize = (u) => {
        if (['g', 'gram', 'grams', 'gm'].includes(u))
            return 'g';
        if (['kg', 'kilogram', 'kilograms', 'kgs'].includes(u))
            return 'kg';
        if (['ml', 'millilitre', 'millilitres', 'milliliter'].includes(u))
            return 'ml';
        if (['l', 'ltr', 'litre', 'litres', 'liter'].includes(u))
            return 'l';
        return u;
    };
    const normFrom = normalize(from);
    const normTo = normalize(to);
    if (normFrom === normTo)
        return recipeQty;
    if (normFrom === 'g' && normTo === 'kg')
        return recipeQty / 1000;
    if (normFrom === 'kg' && normTo === 'g')
        return recipeQty * 1000;
    if (normFrom === 'ml' && normTo === 'l')
        return recipeQty / 1000;
    if (normFrom === 'l' && normTo === 'ml')
        return recipeQty * 1000;
    throw new Error(`Incompatible unit conversion between recipe unit (${recipeUnit}) and inventory base unit (${inventoryBaseUnit})`);
}
// ============================================================================
// CORE ATOMIC ORDER & STOCK DEDUCTION SERVICE
// ============================================================================
class OrderService {
    /**
     * Creates an order, calculates Kenyan VAT + Catering Levy accurately,
     * optionally occupies the dining table, and executes atomic recipe/BOM
     * stock deductions if configured at order confirmation.
     */
    static async createOrderWithStockDeduction(input) {
        if (!input.items || input.items.length === 0) {
            throw new Error('Order must contain at least one menu item.');
        }
        return await db_1.db.transaction(async (tx) => {
            // 1. Idempotency Check: Prevent duplicate orders on network/offline retries
            if (input.idempotencyKey) {
                const existingOrder = await tx.query.orders.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, input.tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.idempotencyKey, input.idempotencyKey)),
                    with: { items: true },
                });
                if (existingOrder) {
                    return {
                        order: existingOrder,
                        lowStockAlerts: [],
                        idempotentReplay: true,
                    };
                }
            }
            // 2. Fetch and validate all requested Menu Items belonging to this Tenant
            const requestedItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
            const dbMenuItems = await tx
                .select()
                .from(schema_1.menuItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuItems.tenantId, input.tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuItems.id, requestedItemIds)));
            if (dbMenuItems.length !== requestedItemIds.length) {
                throw new Error('One or more menu items were not found or belong to another tenant.');
            }
            const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));
            // Verify item availability
            for (const line of input.items) {
                const menuItem = menuMap.get(line.menuItemId);
                if (!menuItem.isAvailable) {
                    throw new Error(`Menu item "${menuItem.name}" is currently marked unavailable.`);
                }
            }
            // 3. Fetch any selected modifiers and validate ownership
            const allModifierIds = [
                ...new Set(input.items.flatMap((i) => i.selectedModifierIds || [])),
            ];
            const dbModifiers = allModifierIds.length > 0
                ? await tx
                    .select()
                    .from(schema_1.menuModifiers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.menuModifiers.tenantId, input.tenantId), (0, drizzle_orm_1.inArray)(schema_1.menuModifiers.id, allModifierIds)))
                : [];
            const modifierMap = new Map(dbModifiers.map((m) => [m.id, m]));
            // 4. Calculate Line Totals, VAT (16%), and Catering Levy (2%)
            let subtotal = 0;
            let totalTax = 0;
            let totalCateringLevy = 0;
            const preparedOrderLines = [];
            for (const line of input.items) {
                const item = menuMap.get(line.menuItemId);
                const basePrice = Number(item.price);
                let modPricePerUnit = 0;
                const selectedModsJson = [];
                for (const modId of line.selectedModifierIds || []) {
                    const mod = modifierMap.get(modId);
                    if (!mod || mod.menuItemId !== item.id) {
                        throw new Error(`Invalid modifier ID ${modId} for menu item "${item.name}".`);
                    }
                    const mPrice = Number(mod.priceDelta);
                    modPricePerUnit += mPrice;
                    selectedModsJson.push({
                        modifierId: mod.id,
                        name: `${mod.groupName}: ${mod.optionName}`,
                        price: mPrice,
                        linkedInventoryItemId: mod.linkedInventoryItemId,
                        linkedQuantity: mod.linkedQuantity,
                    });
                }
                const lineTotal = Number(((basePrice + modPricePerUnit) * line.quantity).toFixed(2));
                const vatRate = Number(item.taxRate) / 100; // e.g., 0.16
                const levyRate = Number(item.cateringLevyRate) / 100; // e.g., 0.02
                const combinedTaxRate = vatRate + levyRate;
                if (item.isTaxInclusive) {
                    // Extract net price from tax-inclusive menu price
                    const netLineAmount = lineTotal / (1 + combinedTaxRate);
                    const lineVat = netLineAmount * vatRate;
                    const lineLevy = netLineAmount * levyRate;
                    subtotal += netLineAmount;
                    totalTax += lineVat;
                    totalCateringLevy += lineLevy;
                }
                else {
                    const lineVat = lineTotal * vatRate;
                    const lineLevy = lineTotal * levyRate;
                    subtotal += lineTotal;
                    totalTax += lineVat;
                    totalCateringLevy += lineLevy;
                }
                preparedOrderLines.push({
                    menuItem: item,
                    quantity: line.quantity,
                    unitPrice: basePrice,
                    modifiersPrice: modPricePerUnit,
                    totalPrice: lineTotal,
                    selectedModifiersJson: selectedModsJson,
                    notes: line.notes,
                });
            }
            const discountTotal = Number((input.discountTotal || 0).toFixed(2));
            const deliveryFee = Number((input.deliveryFee || 0).toFixed(2));
            const grossTotal = Number((subtotal + totalTax + totalCateringLevy - discountTotal + deliveryFee).toFixed(2));
            // Generate collision-resistant tenant order number
            const timestampSuffix = Date.now().toString().slice(-6);
            const randomSuffix = Math.floor(100 + Math.random() * 900);
            const orderNumber = `SRV-${timestampSuffix}-${randomSuffix}`;
            // 5. Insert Order Header
            const [createdOrder] = await tx
                .insert(schema_1.orders)
                .values({
                tenantId: input.tenantId,
                branchId: input.branchId ?? null,
                tableId: input.tableId ?? null,
                waiterId: input.waiterId ?? null,
                cashierId: input.cashierId ?? null,
                orderNumber,
                orderType: input.orderType,
                status: 'Sent-To-Kitchen',
                paymentStatus: 'Pending',
                customerName: input.customerName ?? null,
                customerPhone: input.customerPhone ?? null,
                buyerKraPin: input.buyerKraPin ?? null,
                subtotal: subtotal.toFixed(2),
                discountTotal: discountTotal.toFixed(2),
                tax: totalTax.toFixed(2),
                cateringLevy: totalCateringLevy.toFixed(2),
                deliveryFee: deliveryFee.toFixed(2),
                total: Math.max(0, grossTotal).toFixed(2),
                notes: input.notes ?? null,
                idempotencyKey: input.idempotencyKey,
                inventoryDeducted: false,
            })
                .returning();
            // 6. Insert Order Items
            const insertedOrderItems = [];
            for (const prepLine of preparedOrderLines) {
                const [insertedLine] = await tx
                    .insert(schema_1.orderItems)
                    .values({
                    tenantId: input.tenantId,
                    orderId: createdOrder.id,
                    menuItemId: prepLine.menuItem.id,
                    quantity: prepLine.quantity.toFixed(2),
                    unitPrice: prepLine.unitPrice.toFixed(2),
                    modifiersPrice: prepLine.modifiersPrice.toFixed(2),
                    totalPrice: prepLine.totalPrice.toFixed(2),
                    unitCostSnapshot: prepLine.menuItem.costEstimate,
                    selectedModifiers: prepLine.selectedModifiersJson.map((m) => ({
                        modifierId: m.modifierId,
                        name: m.name,
                        price: m.price,
                    })),
                    kitchenStatus: 'New',
                    notes: prepLine.notes ?? null,
                })
                    .returning();
                insertedOrderItems.push({
                    dbOrderItem: insertedLine,
                    menuItem: prepLine.menuItem,
                    modifiers: prepLine.selectedModifiersJson,
                });
            }
            // 7. Mark Restaurant Table as Occupied if Dine-In
            if (input.orderType === 'Dine-In' && input.tableId) {
                await tx
                    .update(schema_1.restaurantTables)
                    .set({
                    status: 'Occupied',
                    assignedWaiterId: input.waiterId ?? null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.restaurantTables.tenantId, input.tenantId), (0, drizzle_orm_1.eq)(schema_1.restaurantTables.id, input.tableId)));
            }
            // 8. Execute Atomic Recipe / BOM Stock Deduction (if configured at order creation)
            let lowStockAlerts = [];
            if (input.deductInventoryImmediately !== false) {
                lowStockAlerts = await this.deductStockForOrderInTransaction(tx, {
                    tenantId: input.tenantId,
                    branchId: input.branchId,
                    orderId: createdOrder.id,
                    userId: input.cashierId || input.waiterId,
                    allowNegativeStockOverride: input.allowNegativeStockOverride ?? false,
                    lines: insertedOrderItems,
                });
            }
            // 9. Write Immutable Audit Log
            await tx.insert(schema_1.auditLogs).values({
                tenantId: input.tenantId,
                branchId: input.branchId ?? null,
                userId: input.cashierId || input.waiterId || null,
                action: 'ORDER_CREATED',
                module: 'POS',
                entityType: 'orders',
                entityId: String(createdOrder.id),
                newValues: {
                    orderNumber: createdOrder.orderNumber,
                    orderType: createdOrder.orderType,
                    total: createdOrder.total,
                    inventoryDeducted: input.deductInventoryImmediately !== false,
                },
            });
            return {
                order: createdOrder,
                items: insertedOrderItems.map((i) => i.dbOrderItem),
                lowStockAlerts,
                idempotentReplay: false,
            };
        });
    }
    /**
     * Deducts stock at both the Direct Stocked Product level and the Recipe Ingredient (BOM)
     * level, including modifier ingredient linkages. Can be called during order creation
     * OR deferred until kitchen fulfillment/payment callback.
     */
    static async deductStockForOrderInTransaction(tx, params) {
        // Verify order has not already deducted stock (idempotency guard)
        const [currentOrder] = await tx
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.tenantId, params.tenantId), (0, drizzle_orm_1.eq)(schema_1.orders.id, params.orderId)))
            .for('update');
        if (!currentOrder || currentOrder.inventoryDeducted) {
            return [];
        }
        const plannedDeductions = [];
        for (const line of params.lines) {
            const { dbOrderItem, menuItem, modifiers } = line;
            const orderQty = Number(dbOrderItem.quantity);
            // CASE A: Direct Stocked Sellable Product (e.g., Bottled Soda, Canned Beer)
            if (menuItem.stockTrackingType === 'STOCKED_PRODUCT') {
                if (!menuItem.directInventoryItemId) {
                    throw new Error(`Menu item "${menuItem.name}" is configured as STOCKED_PRODUCT but has no linked directInventoryItemId.`);
                }
                plannedDeductions.push({
                    inventoryItemId: menuItem.directInventoryItemId,
                    orderItemId: dbOrderItem.id,
                    recipeId: null,
                    requiredQuantity: orderQty,
                    recipeUnit: null,
                    reasonNote: `Direct product sale: ${orderQty}x ${menuItem.name}`,
                    idempotencyKey: `ORD-${params.orderId}-LINE-${dbOrderItem.id}-DIRECT-${menuItem.directInventoryItemId}`,
                });
            }
            // CASE B: Recipe-Based Menu Item (BOM ingredient breakdown)
            if (menuItem.stockTrackingType === 'RECIPE') {
                const [activeRecipe] = await tx
                    .select()
                    .from(schema_1.recipes)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipes.tenantId, params.tenantId), (0, drizzle_orm_1.eq)(schema_1.recipes.menuItemId, menuItem.id), (0, drizzle_orm_1.eq)(schema_1.recipes.isActive, true)));
                // Per Section 16: Flag uncosted/unmapped items explicitly rather than fabricating deductions
                if (!activeRecipe) {
                    throw new Error(`Menu item "${menuItem.name}" is marked as RECIPE-tracked but has no active recipe configured.`);
                }
                const ingredients = await tx
                    .select()
                    .from(schema_1.recipeIngredients)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipeIngredients.tenantId, params.tenantId), (0, drizzle_orm_1.eq)(schema_1.recipeIngredients.recipeId, activeRecipe.id)));
                if (ingredients.length === 0) {
                    throw new Error(`Active recipe for "${menuItem.name}" has zero ingredients mapped.`);
                }
                const yieldPortions = Math.max(Number(activeRecipe.yieldPortions) || 1, 0.0001);
                for (const ing of ingredients) {
                    const baseIngQty = Number(ing.quantity) / yieldPortions;
                    const wastageFactor = 1 + Number(ing.wastagePercentage || 0) / 100;
                    const totalRecipeUnitQty = baseIngQty * wastageFactor * orderQty;
                    plannedDeductions.push({
                        inventoryItemId: ing.inventoryItemId,
                        orderItemId: dbOrderItem.id,
                        recipeId: activeRecipe.id,
                        requiredQuantity: totalRecipeUnitQty,
                        recipeUnit: ing.unit,
                        reasonNote: `Recipe consumption (${menuItem.name} v${activeRecipe.version})`,
                        idempotencyKey: `ORD-${params.orderId}-LINE-${dbOrderItem.id}-REC-${activeRecipe.id}-ING-${ing.inventoryItemId}`,
                    });
                }
            }
            // CASE C: Modifier Ingredient Deductions (e.g., Extra Cheese, Oat Milk)
            for (const mod of modifiers) {
                if (mod.linkedInventoryItemId && Number(mod.linkedQuantity) > 0) {
                    plannedDeductions.push({
                        inventoryItemId: mod.linkedInventoryItemId,
                        orderItemId: dbOrderItem.id,
                        recipeId: null,
                        requiredQuantity: Number(mod.linkedQuantity) * orderQty,
                        recipeUnit: null,
                        reasonNote: `Modifier consumption (${mod.name})`,
                        idempotencyKey: `ORD-${params.orderId}-LINE-${dbOrderItem.id}-MOD-${mod.modifierId}-ING-${mod.linkedInventoryItemId}`,
                    });
                }
            }
        }
        if (plannedDeductions.length === 0) {
            return [];
        }
        // Lock all affected inventory items in deterministic ID order to prevent deadlocks
        const affectedInventoryIds = [
            ...new Set(plannedDeductions.map((d) => d.inventoryItemId)),
        ].sort((a, b) => a - b);
        const lockedInventoryRows = await tx
            .select()
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, params.tenantId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.id, affectedInventoryIds)))
            .for('update');
        const invMap = new Map(lockedInventoryRows.map((row) => [row.id, row]));
        const runningBalances = new Map(lockedInventoryRows.map((row) => [row.id, Number(row.currentStock)]));
        const orderLineCogsAccumulator = new Map();
        // Execute unit conversions, negative stock checks, and ledger inserts
        for (const deduction of plannedDeductions) {
            const invItem = invMap.get(deduction.inventoryItemId);
            if (!invItem) {
                throw new Error(`Inventory item ID ${deduction.inventoryItemId} not found for tenant.`);
            }
            const deductionInBaseUnit = deduction.recipeUnit
                ? convertToInventoryBaseUnit(deduction.requiredQuantity, deduction.recipeUnit, invItem.unit)
                : deduction.requiredQuantity;
            const currentBal = runningBalances.get(invItem.id);
            const newBalance = Number((currentBal - deductionInBaseUnit).toFixed(4));
            // Enforce negative stock policy per Section 15 & 16
            if (newBalance < 0 &&
                !invItem.allowNegativeStock &&
                !params.allowNegativeStockOverride) {
                throw new Error(`Insufficient stock for "${invItem.name}". Available: ${currentBal} ${invItem.unit}, Required: ${deductionInBaseUnit.toFixed(4)} ${invItem.unit}.`);
            }
            runningBalances.set(invItem.id, newBalance);
            // Accumulate historical COGS for this order line
            const lineIngredientCost = deductionInBaseUnit * Number(invItem.costPrice);
            orderLineCogsAccumulator.set(deduction.orderItemId, (orderLineCogsAccumulator.get(deduction.orderItemId) || 0) + lineIngredientCost);
            // Insert immutable stock movement record with totalValuation included
            const qtyNum = -deductionInBaseUnit;
            const unitCostNum = Number(invItem.costPrice) || 0;
            const totalValuationNum = Number((Math.abs(qtyNum) * unitCostNum).toFixed(4));
            await tx.insert(schema_1.stockMovements).values({
                tenantId: params.tenantId,
                inventoryItemId: invItem.id,
                orderId: params.orderId,
                userId: params.userId ?? null,
                type: 'SALE_CONSUMPTION',
                quantity: qtyNum.toFixed(4),
                unitCost: unitCostNum.toFixed(4),
                totalValuation: totalValuationNum.toFixed(4), // REQUIRED by stockMovements schema
                balanceAfter: newBalance.toFixed(4),
                notes: deduction.reasonNote,
            });
        }
        // Persist updated balances on inventory_items and evaluate low-stock thresholds
        const lowStockAlerts = [];
        for (const [invId, finalBalance] of runningBalances.entries()) {
            const invItem = invMap.get(invId);
            await tx
                .update(schema_1.inventoryItems)
                .set({
                currentStock: finalBalance.toFixed(4),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.tenantId, params.tenantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, invId)));
            if (finalBalance <= Number(invItem.minThreshold)) {
                lowStockAlerts.push({
                    inventoryItemId: invItem.id,
                    name: invItem.name,
                    currentStock: finalBalance.toFixed(4),
                    minThreshold: invItem.minThreshold,
                    unit: invItem.unit,
                });
            }
        }
        // Update each order_item with its true calculated recipe COGS snapshot
        for (const [orderItemId, totalLineCogs] of orderLineCogsAccumulator.entries()) {
            await tx
                .update(schema_1.orderItems)
                .set({
                unitCostSnapshot: totalLineCogs.toFixed(2),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.orderItems.id, orderItemId));
        }
        // Mark order as inventoryDeducted = true so retries never deduct twice
        await tx
            .update(schema_1.orders)
            .set({
            inventoryDeducted: true,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.orders.id, params.orderId));
        return lowStockAlerts;
    }
}
exports.OrderService = OrderService;
