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
exports.adjustStock = exports.createInventoryItem = exports.getInventory = void 0;
const inventoryService = __importStar(require("../services/inventory.service"));
const getInventory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const items = await inventoryService.fetchInventoryItems(tenantId);
        res.status(200).json({ status: 'success', data: items });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch inventory' });
    }
};
exports.getInventory = getInventory;
const createInventoryItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const newItem = await inventoryService.addInventoryItem(tenantId, req.body);
        res.status(201).json({ status: 'success', data: newItem });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to create inventory item' });
    }
};
exports.createInventoryItem = createInventoryItem;
const adjustStock = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { itemId, adjustment, type, notes } = req.body;
        await inventoryService.processStockAdjustment(tenantId, {
            itemId,
            adjustment,
            type: type || 'ADJUSTMENT',
            notes,
        });
        res.status(200).json({ status: 'success', message: 'Stock adjusted successfully' });
    }
    catch (error) {
        res.status(400).json({ status: 'error', message: error.message || 'Failed to adjust stock' });
    }
};
exports.adjustStock = adjustStock;
