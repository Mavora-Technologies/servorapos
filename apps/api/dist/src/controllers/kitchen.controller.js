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
exports.getPerformance = exports.getHistory = exports.updateStatus = exports.getTickets = void 0;
const kitchenService = __importStar(require("../services/kitchen.service"));
const getTickets = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const station = req.query.station;
        const tickets = await kitchenService.fetchActiveTickets(tenantId, station);
        res.status(200).json({ status: 'success', data: tickets });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch tickets' });
    }
};
exports.getTickets = getTickets;
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const id = req.params.id;
        const { status } = req.body;
        await kitchenService.advanceTicketStatus(tenantId, parseInt(id, 10), status);
        res.status(200).json({ status: 'success', message: `Order marked as ${status}` });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.updateStatus = updateStatus;
const getHistory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Call through kitchenService instead of kitchenRepo
        const history = await kitchenService.fetchKitchenHistory(tenantId);
        res.status(200).json({ status: 'success', data: history });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen history' });
    }
};
exports.getHistory = getHistory;
const getPerformance = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const stats = await kitchenService.fetchKitchenPerformance(tenantId);
        res.status(200).json({ status: 'success', data: stats });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch kitchen performance stats' });
    }
};
exports.getPerformance = getPerformance;
