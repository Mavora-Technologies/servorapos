"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnlineOrders = exports.getOrderDetail = exports.getOrders = exports.getTakeawayOrders = exports.updateStatus = exports.getOpenOrders = exports.createOrder = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const orderRepo = __importStar(require("../repositories/order.repository"));
const order_repository_1 = require("../repositories/order.repository");
const posRepo = __importStar(require("../repositories/pos-terminal.repository"));
const order_validator_1 = require("../validators/order.validator");
const resolveAuthenticatedUserId = async (req) => {
    const rawId = req.user?.userId ??
        req.user?.id ??
        req.user?.sub ??
        null;
    if (rawId && !Number.isNaN(Number(rawId))) {
        return Number(rawId);
    }
    if (req.user?.email && req.user?.tenantId) {
        const [u] = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, req.user.tenantId), (0, drizzle_orm_1.eq)(schema_1.users.email, req.user.email)))
            .limit(1);
        return u?.id ?? null;
    }
    return null;
};
const createOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const authenticatedUserId = await resolveAuthenticatedUserId(req);
        const { idempotencyKey, branchId, cashDrawerId, cashierShiftId, waiterId, customerId, orderType, targetStation, subtotal, discountTotal, tax, cateringLevy, serviceCharge, packingCharge, total, cashTendered, items, tableId, tableName, customerName, customerPhone, buyerKraPin, paymentMethod, notes, isExternalStorefront, } = req.body;
        const effectiveBranchId = branchId !== undefined && branchId !== null
            ? Number(branchId)
            : req.user?.defaultBranchId
                ? Number(req.user.defaultBranchId)
                : null;
        const effectiveWaiterId = waiterId !== undefined && waiterId !== null
            ? Number(waiterId)
            : authenticatedUserId;
        const normalizedItems = Array.isArray(items)
            ? items
                .map((i) => ({
                menuItemId: Number(i.menuItemId),
                quantity: Number(i.quantity),
            }))
                .filter((i) => Number.isInteger(i.menuItemId) && i.menuItemId > 0 && i.quantity > 0)
            : [];
        // 1. Enforce live stock & manual availability limits before creating the order
        if (normalizedItems.length > 0) {
            const stockCheck = await posRepo.validateOrderStockAvailability(tenantId, normalizedItems, effectiveBranchId ?? undefined);
            if (!stockCheck.valid) {
                res.status(409).json({
                    status: 'error',
                    code: 'INSUFFICIENT_STOCK',
                    message: stockCheck.shortages.map((s) => s.reason).join(' '),
                    shortages: stockCheck.shortages,
                });
                return;
            }
        }
        // 2. Create the order record (enforces transactional 409 closed-register custody & idempotency)
        const order = await orderRepo.createOrderRecord(tenantId, {
            idempotencyKey: idempotencyKey ? String(idempotencyKey) : null,
            branchId: effectiveBranchId,
            waiterId: effectiveWaiterId,
            cashierId: authenticatedUserId,
            cashDrawerId: cashDrawerId ? Number(cashDrawerId) : null,
            cashierShiftId: cashierShiftId ? Number(cashierShiftId) : null,
            customerId: customerId ? Number(customerId) : null,
            orderType,
            targetStation,
            subtotal,
            discountTotal,
            tax,
            cateringLevy,
            serviceCharge,
            packingCharge,
            total,
            cashTendered,
            tableId,
            tableName,
            customerName,
            customerPhone,
            buyerKraPin,
            paymentMethod,
            notes,
            isExternalStorefront: Boolean(isExternalStorefront),
        }, items);
        const isReplay = 'isIdempotentReplay' in order && Boolean(order.isIdempotentReplay);
        // 3. Synchronize menu_item_availability remainingCount / is86ed (skipped on idempotent replay)
        if (!isReplay && order?.id && normalizedItems.length > 0) {
            await posRepo.syncPostOrderStockAndAvailability({
                tenantId,
                branchId: effectiveBranchId,
                userId: authenticatedUserId,
                orderId: Number(order.id),
                orderNumber: String(order.orderNumber || `ORD-${order.id}`),
                items: normalizedItems,
            });
        }
        res.status(isReplay ? 200 : 201).json({ status: 'success', data: order });
    }
    catch (error) {
        if (error instanceof order_repository_1.RegisterClosedError) {
            res.status(409).json({
                status: 'error',
                code: error.code,
                message: error.message,
            });
            return;
        }
        console.error('[Order Error]:', error);
        const message = error instanceof Error ? error.message : 'Failed to process order';
        res.status(500).json({ status: 'error', message });
    }
};
exports.createOrder = createOrder;
const getOpenOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const openOrders = await orderRepo.fetchOpenOrders(tenantId, branchId);
        res.status(200).json({ status: 'success', data: openOrders });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch open orders';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getOpenOrders = getOpenOrders;
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = await resolveAuthenticatedUserId(req);
        const id = req.params.id;
        const { status } = req.body;
        await orderRepo.updateOrderStatus(tenantId, parseInt(id, 10), status, userId);
        res.status(200).json({ status: 'success', message: `Order updated to ${status}` });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update order status';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateStatus = updateStatus;
const getTakeawayOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const takeawayOrders = await orderRepo.fetchTakeawayOrders(tenantId, branchId);
        res.status(200).json({ status: 'success', data: takeawayOrders });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch takeaway orders';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getTakeawayOrders = getTakeawayOrders;
const getOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const parsed = order_validator_1.listOrdersQuerySchema.safeParse(req.query);
        const allOrders = await orderRepo.fetchTenantOrders(tenantId, parsed.success ? parsed.data : undefined);
        res.status(200).json({ status: 'success', data: allOrders });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch orders';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getOrders = getOrders;
const getOrderDetail = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const orderId = parseInt(String(req.params.id), 10);
        if (Number.isNaN(orderId)) {
            res.status(400).json({ status: 'error', message: 'Invalid order ID' });
            return;
        }
        const detail = await orderRepo.fetchOrderDetailById(tenantId, orderId);
        if (!detail) {
            res.status(404).json({ status: 'error', message: 'Order record not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: detail });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load order details';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getOrderDetail = getOrderDetail;
const getOnlineOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const onlineOrders = await orderRepo.fetchOnlineStorefrontOrders(tenantId, branchId);
        res.status(200).json({ status: 'success', data: onlineOrders });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch online orders';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getOnlineOrders = getOnlineOrders;
