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
const orderRepo = __importStar(require("../repositories/order.repository"));
const order_validator_1 = require("../validators/order.validator");
const createOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const cashierId = req.user?.userId ?? req.user?.id ?? null;
        const { branchId, cashDrawerId, cashierShiftId, customerId, orderType, subtotal, discountTotal, tax, cateringLevy, serviceCharge, packingCharge, total, cashTendered, items, tableId, tableName, customerName, customerPhone, buyerKraPin, paymentMethod, } = req.body;
        const effectiveBranchId = branchId !== undefined && branchId !== null
            ? Number(branchId)
            : req.user?.defaultBranchId
                ? Number(req.user.defaultBranchId)
                : null;
        const order = await orderRepo.createOrderRecord(tenantId, {
            branchId: effectiveBranchId,
            cashierId: cashierId ? Number(cashierId) : null,
            cashDrawerId: cashDrawerId ? Number(cashDrawerId) : null,
            cashierShiftId: cashierShiftId ? Number(cashierShiftId) : null,
            customerId: customerId ? Number(customerId) : null,
            orderType,
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
        }, items);
        res.status(201).json({ status: 'success', data: order });
    }
    catch (error) {
        console.error('[Order Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to process order' });
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
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch open orders' });
    }
};
exports.getOpenOrders = getOpenOrders;
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const id = req.params.id;
        const { status } = req.body;
        await orderRepo.updateOrderStatus(tenantId, parseInt(id, 10), status);
        res.status(200).json({ status: 'success', message: `Order updated to ${status}` });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: 'Failed to update order status' });
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
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch takeaway orders' });
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
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch orders' });
    }
};
exports.getOrders = getOrders;
const getOrderDetail = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const orderId = parseInt(String(req.params.id), 10);
        if (isNaN(orderId)) {
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
        res.status(500).json({ status: 'error', message: error.message || 'Failed to load order details' });
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
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch online orders' });
    }
};
exports.getOnlineOrders = getOnlineOrders;
