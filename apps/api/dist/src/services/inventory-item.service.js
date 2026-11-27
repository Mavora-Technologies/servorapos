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
exports.removeInventoryMasterItem = exports.modifyInventoryMasterItem = exports.registerInventoryMasterItem = exports.fetchInventoryMasterCatalog = void 0;
// apps/api/src/services/inventory-item.service.ts
const inventoryItemRepo = __importStar(require("../repositories/inventory-item.repository"));
const fetchInventoryMasterCatalog = async (tenantId) => {
    const [items, summary] = await Promise.all([
        inventoryItemRepo.findAllMasterItemsByTenant(tenantId),
        inventoryItemRepo.getMasterCatalogSummaryByTenant(tenantId),
    ]);
    return { summary, items };
};
exports.fetchInventoryMasterCatalog = fetchInventoryMasterCatalog;
const registerInventoryMasterItem = async (tenantId, branchId, userId, payload) => {
    return await inventoryItemRepo.createMasterItemTransaction(tenantId, branchId, userId, payload);
};
exports.registerInventoryMasterItem = registerInventoryMasterItem;
const modifyInventoryMasterItem = async (tenantId, itemId, payload) => {
    if (!Number.isInteger(itemId) || itemId <= 0) {
        throw new Error('Invalid inventory item ID');
    }
    return await inventoryItemRepo.updateMasterItemRecord(tenantId, itemId, payload);
};
exports.modifyInventoryMasterItem = modifyInventoryMasterItem;
const removeInventoryMasterItem = async (tenantId, itemId) => {
    if (!Number.isInteger(itemId) || itemId <= 0) {
        throw new Error('Invalid inventory item ID');
    }
    return await inventoryItemRepo.deleteMasterItemRecord(tenantId, itemId);
};
exports.removeInventoryMasterItem = removeInventoryMasterItem;
