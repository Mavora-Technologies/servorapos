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
exports.processStockAdjustment = exports.addInventoryItem = exports.fetchActiveSuppliers = exports.fetchStorageLocations = exports.fetchInventorySummary = exports.fetchInventoryItems = void 0;
// apps/api/src/services/inventory.service.ts
const inventoryRepo = __importStar(require("../repositories/inventory.repository"));
const VALID_MATERIAL_TYPES = [
    'RAW_MATERIAL',
    'SEMI_FINISHED',
    'FINISHED_GOOD',
    'CONSUMABLE',
];
const VALID_VALUATION_METHODS = ['FIFO', 'AVCO', 'STANDARD'];
const VALID_TAX_CLASSIFICATIONS = ['A_16', 'B_ZERO', 'E_EXEMPT'];
const VALID_MOVEMENT_TYPES = [
    'GOODS_RECEIPT_PO',
    'POS_RECIPE_DEPLETION',
    'PHYSICAL_INVENTORY_ADJ',
    'WASTE_SCRAP',
    'SUPPLIER_RETURN',
    'STORNO_REVERSAL',
    'TRANSFER',
];
const fetchInventoryItems = async (tenantId) => {
    return await inventoryRepo.getItemsByTenant(tenantId);
};
exports.fetchInventoryItems = fetchInventoryItems;
const fetchInventorySummary = async (tenantId) => {
    return await inventoryRepo.getInventorySummaryByTenant(tenantId);
};
exports.fetchInventorySummary = fetchInventorySummary;
const fetchStorageLocations = async (tenantId) => {
    return await inventoryRepo.getStorageLocationsByTenant(tenantId);
};
exports.fetchStorageLocations = fetchStorageLocations;
const fetchActiveSuppliers = async (tenantId) => {
    return await inventoryRepo.getSuppliersByTenant(tenantId);
};
exports.fetchActiveSuppliers = fetchActiveSuppliers;
const addInventoryItem = async (tenantId, userId, branchId, data) => {
    const trimmedName = data.name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
        throw new Error('Article description must be at least 2 characters');
    }
    if (!data.category?.trim()) {
        throw new Error('Category is required');
    }
    if (!data.unit?.trim()) {
        throw new Error('Base tracking unit is required');
    }
    const parsedCost = Number(data.costPrice ?? 0);
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
        throw new Error('Standard cost must be zero or greater');
    }
    const parsedConversion = Number(data.conversionFactor ?? 1);
    if (Number.isNaN(parsedConversion) || parsedConversion <= 0) {
        throw new Error('Unit conversion factor must be greater than zero');
    }
    const parsedOpeningStock = Number(data.currentStock ?? 0);
    if (Number.isNaN(parsedOpeningStock) || parsedOpeningStock < 0) {
        throw new Error('Opening stock cannot be negative');
    }
    const parsedMinThreshold = Number(data.minThreshold ?? 0);
    const parsedReorderQty = Number(data.reorderQuantity ?? 0);
    const materialType = VALID_MATERIAL_TYPES.includes(data.materialType)
        ? data.materialType
        : 'RAW_MATERIAL';
    const valuationMethod = VALID_VALUATION_METHODS.includes(data.valuationMethod)
        ? data.valuationMethod
        : 'FIFO';
    const taxClassification = VALID_TAX_CLASSIFICATIONS.includes(data.taxClassification)
        ? data.taxClassification
        : 'A_16';
    return await inventoryRepo.createInventoryItemRecord(tenantId, {
        branchId,
        userId,
        name: trimmedName,
        sku: data.sku?.trim() || null,
        barcode: data.barcode?.trim() || null,
        materialType,
        category: data.category.trim(),
        unit: data.unit.trim(),
        purchaseUnit: data.purchaseUnit?.trim() || null,
        conversionFactor: parsedConversion.toFixed(4),
        preferredSupplierId: data.preferredSupplierId && !Number.isNaN(Number(data.preferredSupplierId))
            ? Number(data.preferredSupplierId)
            : null,
        openingStock: parsedOpeningStock,
        minThreshold: (!Number.isNaN(parsedMinThreshold) && parsedMinThreshold >= 0
            ? parsedMinThreshold
            : 0).toFixed(4),
        reorderQuantity: (!Number.isNaN(parsedReorderQty) && parsedReorderQty >= 0
            ? parsedReorderQty
            : 0).toFixed(4),
        costPrice: parsedCost.toFixed(4),
        valuationMethod,
        storageCondition: data.storageCondition?.trim() || 'DRY_AMBIENT',
        taxClassification,
        allowNegativeStock: Boolean(data.allowNegativeStock),
        isActive: data.isActive ?? true,
    });
};
exports.addInventoryItem = addInventoryItem;
const processStockAdjustment = async (tenantId, data) => {
    if (!data.itemId || Number.isNaN(Number(data.itemId))) {
        throw new Error('Valid inventory item ID is required');
    }
    if (typeof data.adjustment !== 'number' || Number.isNaN(data.adjustment) || data.adjustment === 0) {
        throw new Error('Quantity delta must be a non-zero number');
    }
    if (!VALID_MOVEMENT_TYPES.includes(data.type)) {
        throw new Error(`Unsupported movement type: ${data.type}`);
    }
    if (data.type === 'GOODS_RECEIPT_PO' && data.adjustment <= 0) {
        throw new Error('Goods receipt quantity must be greater than zero');
    }
    if (data.type === 'WASTE_SCRAP' && data.adjustment >= 0) {
        throw new Error('Waste/scrap quantity delta must be negative');
    }
    return await inventoryRepo.adjustStockTransaction(tenantId, {
        itemId: Number(data.itemId),
        branchId: data.branchId,
        userId: data.userId,
        adjustment: data.adjustment,
        type: data.type,
        locationId: data.locationId ?? null,
        locationBin: data.locationBin?.trim() || null,
        batchNumber: data.batchNumber?.trim() || null,
        documentReference: data.documentReference?.trim() || null,
        notes: data.notes?.trim() || null,
    });
};
exports.processStockAdjustment = processStockAdjustment;
