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
exports.deleteInventoryItemMaster = exports.updateInventoryItemMaster = exports.createInventoryItemMaster = exports.getInventoryItemsMaster = void 0;
const zod_1 = require("zod");
const inventoryItemService = __importStar(require("../services/inventory-item.service"));
const inventory_item_validator_1 = require("../validators/inventory-item.validator");
function getPgErrorCode(error) {
    if (typeof error === 'object' && error !== null) {
        const errObj = error;
        return errObj.code ?? errObj.cause?.code;
    }
    return undefined;
}
const getInventoryItemsMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const catalog = await inventoryItemService.fetchInventoryMasterCatalog(tenantId);
        res.status(200).json({ status: 'success', data: catalog });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch inventory catalog';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getInventoryItemsMaster = getInventoryItemsMaster;
const createInventoryItemMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = inventory_item_validator_1.createInventoryItemMasterSchema.parse(req.body);
        const branchId = req.user?.defaultBranchId ?? null;
        const userId = req.user?.userId ?? null;
        const item = await inventoryItemService.registerInventoryMasterItem(tenantId, branchId, userId, payload);
        res.status(201).json({ status: 'success', data: item });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to create inventory item';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createInventoryItemMaster = createInventoryItemMaster;
const updateInventoryItemMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const itemId = Number(req.params.id);
        if (!Number.isInteger(itemId) || itemId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid item ID' });
            return;
        }
        const payload = inventory_item_validator_1.updateInventoryItemMasterSchema.parse(req.body);
        const updated = await inventoryItemService.modifyInventoryMasterItem(tenantId, itemId, payload);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Inventory item not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Validation failed',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to update inventory item';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateInventoryItemMaster = updateInventoryItemMaster;
const deleteInventoryItemMaster = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const itemId = Number(req.params.id);
        if (!Number.isInteger(itemId) || itemId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid item ID' });
            return;
        }
        const deleted = await inventoryItemService.removeInventoryMasterItem(tenantId, itemId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Inventory item not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Material record deleted from catalog' });
    }
    catch (error) {
        // Handle PostgreSQL foreign key constraint violation (23503) gracefully
        if (getPgErrorCode(error) === '23503') {
            res.status(409).json({
                status: 'error',
                message: 'This material has linked stock movements, recipes, or purchase records and cannot be deleted. Mark it as Inactive instead.',
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to delete inventory item';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteInventoryItemMaster = deleteInventoryItemMaster;
