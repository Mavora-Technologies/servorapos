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
exports.fetchCategories = exports.fetchActiveMenu = exports.fetchMenuCatalog = exports.removeMenuItem = exports.modifyMenuItem = exports.addMenuItem = exports.removeCategory = exports.modifyCategory = exports.addCategory = exports.cleanupOrphanedMenuImage = exports.requestMenuImageUploadSignature = void 0;
// apps/api/src/services/menu.service.ts
const menuRepo = __importStar(require("../repositories/menu.repository"));
const pricing_service_1 = require("./pricing.service");
const cloudinary_1 = require("../utils/cloudinary");
const requestMenuImageUploadSignature = (tenantId) => {
    return (0, cloudinary_1.generateMenuImageUploadSignature)(tenantId);
};
exports.requestMenuImageUploadSignature = requestMenuImageUploadSignature;
const cleanupOrphanedMenuImage = async (tenantId, publicId) => {
    (0, cloudinary_1.assertPublicIdBelongsToTenant)(tenantId, publicId);
    const stillUsed = await menuRepo.isImagePublicIdReferenced(tenantId, publicId);
    if (stillUsed) {
        return { ok: true, result: 'in_use_skipped' };
    }
    return await (0, cloudinary_1.destroyTenantCloudinaryImage)(tenantId, publicId);
};
exports.cleanupOrphanedMenuImage = cleanupOrphanedMenuImage;
const addCategory = async (tenantId, data) => {
    return await menuRepo.createCategory(tenantId, data);
};
exports.addCategory = addCategory;
const modifyCategory = async (tenantId, categoryId, data) => {
    return await menuRepo.updateCategoryRecord(tenantId, categoryId, data);
};
exports.modifyCategory = modifyCategory;
const removeCategory = async (tenantId, categoryId) => {
    return await menuRepo.deleteCategoryRecord(tenantId, categoryId);
};
exports.removeCategory = removeCategory;
const addMenuItem = async (tenantId, data) => {
    return await menuRepo.createMenuItemTransaction(tenantId, data);
};
exports.addMenuItem = addMenuItem;
const modifyMenuItem = async (tenantId, itemId, data) => {
    const result = await menuRepo.updateMenuItemTransaction(tenantId, itemId, data);
    if (!result)
        return null;
    const { item: updated, previousImagePublicId } = result;
    if (previousImagePublicId && previousImagePublicId !== updated.imagePublicId) {
        const stillUsed = await menuRepo.isImagePublicIdReferenced(tenantId, previousImagePublicId);
        if (!stillUsed) {
            void (0, cloudinary_1.destroyTenantCloudinaryImage)(tenantId, previousImagePublicId);
        }
    }
    return updated;
};
exports.modifyMenuItem = modifyMenuItem;
const removeMenuItem = async (tenantId, itemId) => {
    const deleted = await menuRepo.deleteMenuItemRecord(tenantId, itemId);
    if (deleted?.imagePublicId) {
        const stillUsed = await menuRepo.isImagePublicIdReferenced(tenantId, deleted.imagePublicId);
        if (!stillUsed) {
            void (0, cloudinary_1.destroyTenantCloudinaryImage)(tenantId, deleted.imagePublicId);
        }
    }
    return deleted;
};
exports.removeMenuItem = removeMenuItem;
const fetchMenuCatalog = async (tenantId, branchId) => {
    return await menuRepo.getMenuCatalogWithLinks(tenantId, branchId);
};
exports.fetchMenuCatalog = fetchMenuCatalog;
// Evaluates live scheduled tariff rules for POS terminals (branch-specific rules take priority)
const fetchActiveMenu = async (tenantId, branchId) => {
    const { categories, items, pricingRules } = await menuRepo.getActiveMenu(tenantId, branchId);
    const now = new Date();
    return {
        categories: categories.map((c) => c.name),
        categoryRecords: categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
        })),
        items: items.map((i) => {
            const basePrice = parseFloat(i.price) || 0;
            const itemRules = pricingRules.filter((r) => r.menuItemId === i.id);
            // Prefer an active branch-specific rule; fall back to an active tenant-wide rule
            const activeRule = (branchId
                ? itemRules.find((r) => r.branchId === branchId && (0, pricing_service_1.isRuleCurrentlyActive)(r, now))
                : undefined) ??
                itemRules.find((r) => (0, pricing_service_1.isRuleCurrentlyActive)(r, now)) ??
                null;
            const effectivePrice = activeRule
                ? (0, pricing_service_1.computeRuleAdjustedPrice)(basePrice, activeRule.ruleType, parseFloat(activeRule.value) || 0)
                : basePrice;
            const optimizedCardUrl = (0, cloudinary_1.buildOptimizedCloudinaryUrl)(i.imageUrl, 400, 300);
            const optimizedThumbUrl = (0, cloudinary_1.buildOptimizedCloudinaryUrl)(i.imageUrl, 96, 96);
            return {
                id: i.id.toString(),
                categoryId: i.categoryId,
                name: i.name,
                sku: i.sku || undefined,
                price: effectivePrice,
                originalPrice: basePrice,
                activePricingRule: activeRule
                    ? {
                        id: activeRule.id,
                        ruleName: activeRule.ruleName,
                        ruleType: activeRule.ruleType,
                    }
                    : null,
                costEstimate: parseFloat(i.costEstimate),
                stockTrackingType: i.stockTrackingType,
                directInventoryItemId: i.directInventoryItemId,
                kitchenStation: i.kitchenStation,
                isAvailable: i.isAvailable,
                image: optimizedCardUrl,
                imageUrl: i.imageUrl,
                imageCardUrl: optimizedCardUrl,
                imageThumbUrl: optimizedThumbUrl,
                imagePublicId: i.imagePublicId,
                category: categories.find((c) => c.id === i.categoryId)?.name || 'Uncategorized',
            };
        }),
    };
};
exports.fetchActiveMenu = fetchActiveMenu;
const fetchCategories = async (tenantId, branchId, includeInactive = false) => {
    return await menuRepo.getCategories(tenantId, branchId, includeInactive);
};
exports.fetchCategories = fetchCategories;
