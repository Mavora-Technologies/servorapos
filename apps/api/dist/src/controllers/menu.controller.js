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
exports.getCategories = exports.deleteCategory = exports.updateCategory = exports.getActiveMenu = exports.deleteMenuItem = exports.updateMenuItem = exports.createMenuItem = exports.getMenuCatalog = exports.createCategory = exports.deleteMenuImageAsset = exports.signMenuImageUpload = void 0;
const zod_1 = require("zod");
const menu_validator_1 = require("../validators/menu.validator");
const menuService = __importStar(require("../services/menu.service"));
function getPgErrorCode(error) {
    if (typeof error === 'object' && error !== null) {
        const errObj = error;
        return errObj.code ?? errObj.cause?.code;
    }
    return undefined;
}
function parseOptionalBranchId(raw) {
    if (raw === undefined || raw === null || raw === '' || raw === 'ALL')
        return undefined;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
const signMenuImageUpload = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        menu_validator_1.signMenuImageUploadSchema.parse(req.body);
        const signed = menuService.requestMenuImageUploadSignature(tenantId);
        res.status(200).json({ status: 'success', data: signed });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid image file parameters',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to authorize Cloudinary upload';
        res.status(400).json({ status: 'error', message });
    }
};
exports.signMenuImageUpload = signMenuImageUpload;
const deleteMenuImageAsset = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const { publicId } = menu_validator_1.deleteMenuImageSchema.parse(req.body);
        const result = await menuService.cleanupOrphanedMenuImage(tenantId, publicId);
        res.status(200).json({ status: 'success', data: result });
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            res.status(400).json({
                status: 'error',
                message: error.issues[0]?.message || 'Invalid image asset reference',
                errors: error.issues,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to remove image asset';
        res.status(400).json({ status: 'error', message });
    }
};
exports.deleteMenuImageAsset = deleteMenuImageAsset;
const createCategory = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const validatedData = menu_validator_1.createCategorySchema.parse(req.body);
        const category = await menuService.addCategory(tenantId, validatedData);
        res.status(201).json({ status: 'success', data: category });
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
        const message = error instanceof Error ? error.message : 'Failed to create category';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createCategory = createCategory;
const getMenuCatalog = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = parseOptionalBranchId(req.query.branchId);
        const catalog = await menuService.fetchMenuCatalog(tenantId, branchId);
        res.status(200).json({ status: 'success', data: catalog });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load menu catalog';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getMenuCatalog = getMenuCatalog;
const createMenuItem = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const validatedData = menu_validator_1.createMenuItemSchema.parse(req.body);
        const item = await menuService.addMenuItem(tenantId, validatedData);
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
        const message = error instanceof Error ? error.message : 'Failed to create menu item';
        res.status(400).json({ status: 'error', message });
    }
};
exports.createMenuItem = createMenuItem;
const updateMenuItem = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const itemId = Number(req.params.id);
        if (!Number.isInteger(itemId) || itemId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid menu item ID' });
            return;
        }
        const validatedData = menu_validator_1.updateMenuItemSchema.parse(req.body);
        const updated = await menuService.modifyMenuItem(tenantId, itemId, validatedData);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Menu item not found' });
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
        const message = error instanceof Error ? error.message : 'Failed to update menu item';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateMenuItem = updateMenuItem;
const deleteMenuItem = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const itemId = Number(req.params.id);
        if (!Number.isInteger(itemId) || itemId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid menu item ID' });
            return;
        }
        const deleted = await menuService.removeMenuItem(tenantId, itemId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Menu item not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Menu item deleted successfully' });
    }
    catch (error) {
        if (getPgErrorCode(error) === '23503') {
            res.status(409).json({
                status: 'error',
                message: 'This menu item is referenced by historical POS orders and cannot be deleted. Hide it instead by turning off availability.',
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to delete menu item';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteMenuItem = deleteMenuItem;
const getActiveMenu = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = parseOptionalBranchId(req.query.branchId);
        const menu = await menuService.fetchActiveMenu(tenantId, branchId);
        res.status(200).json({ status: 'success', data: menu });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch active menu';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getActiveMenu = getActiveMenu;
const updateCategory = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const categoryId = Number(req.params.id);
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid category ID' });
            return;
        }
        const validatedData = menu_validator_1.updateCategorySchema.parse(req.body);
        const updated = await menuService.modifyCategory(tenantId, categoryId, validatedData);
        if (!updated) {
            res.status(404).json({ status: 'error', message: 'Category not found' });
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
        const message = error instanceof Error ? error.message : 'Failed to update category';
        res.status(400).json({ status: 'error', message });
    }
};
exports.updateCategory = updateCategory;
const deleteCategory = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const categoryId = Number(req.params.id);
        if (!Number.isInteger(categoryId) || categoryId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid category ID' });
            return;
        }
        const deleted = await menuService.removeCategory(tenantId, categoryId);
        if (!deleted) {
            res.status(404).json({ status: 'error', message: 'Category not found' });
            return;
        }
        res.status(200).json({ status: 'success', message: 'Category deleted successfully' });
    }
    catch (error) {
        const statusCode = error?.statusCode;
        if (statusCode === 409 || getPgErrorCode(error) === '23503') {
            const message = error instanceof Error
                ? error.message
                : 'Category still has linked menu items and cannot be deleted.';
            res.status(409).json({ status: 'error', message });
            return;
        }
        const message = error instanceof Error ? error.message : 'Failed to delete category';
        res.status(500).json({ status: 'error', message });
    }
};
exports.deleteCategory = deleteCategory;
const getCategories = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = parseOptionalBranchId(req.query.branchId);
        const includeInactive = req.query.includeInactive === 'true';
        const categories = await menuService.fetchCategories(tenantId, branchId, includeInactive);
        res.status(200).json({ status: 'success', data: categories });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch categories';
        res.status(500).json({ status: 'error', message });
    }
};
exports.getCategories = getCategories;
