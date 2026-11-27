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
exports.adjustStock = exports.createInventoryItem = exports.getStorageLocations = exports.getInventory = void 0;
const inventoryService = __importStar(require("../services/inventory.service"));
const getInventory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const [items, summary] = await Promise.all([
            inventoryService.fetchInventoryItems(tenantId),
            inventoryService.fetchInventorySummary(tenantId),
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                items,
                summary,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch inventory';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getInventory = getInventory;
const getStorageLocations = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const locations = await inventoryService.fetchStorageLocations(tenantId);
        res.status(200).json({ status: 'success', data: locations });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch storage locations';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getStorageLocations = getStorageLocations;
const createInventoryItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? null;
        const branchId = req.user?.defaultBranchId ?? null;
        const newItem = await inventoryService.addInventoryItem(tenantId, userId, branchId, req.body);
        res.status(201).json({ status: 'success', data: newItem });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create inventory item';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createInventoryItem = createInventoryItem;
const adjustStock = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user?.userId ?? null;
        const itemId = Number(req.body.inventoryItemId ?? req.body.itemId);
        const adjustment = Number(req.body.quantityDelta ?? req.body.adjustment);
        const rawLocationId = req.body.locationId;
        const locationId = rawLocationId !== undefined && rawLocationId !== null && rawLocationId !== ''
            ? Number(rawLocationId)
            : null;
        const resolvedBranchId = req.body.branchId !== undefined && req.body.branchId !== null && req.body.branchId !== ''
            ? Number(req.body.branchId)
            : req.user?.defaultBranchId ?? null;
        const result = await inventoryService.processStockAdjustment(tenantId, {
            itemId,
            branchId: resolvedBranchId,
            userId,
            adjustment,
            type: req.body.type || 'PHYSICAL_INVENTORY_ADJ',
            locationId: locationId && !Number.isNaN(locationId) ? locationId : null,
            locationBin: req.body.locationBin ?? null,
            batchNumber: req.body.batchNumber ?? null,
            documentReference: req.body.documentReference ?? null,
            notes: req.body.notes ?? null,
        });
        res.status(200).json({
            status: 'success',
            message: 'Stock movement posted successfully',
            data: result,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to post stock movement';
        res.status(400).json({ status: 'error', message });
    }
};
exports.adjustStock = adjustStock;
