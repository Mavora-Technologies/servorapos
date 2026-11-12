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
exports.getCategories = exports.getActiveMenu = exports.createMenuItem = exports.createCategory = void 0;
const menu_validator_1 = require("../validators/menu.validator");
const menuService = __importStar(require("../services/menu.service"));
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
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};
exports.createCategory = createCategory;
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
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};
exports.createMenuItem = createMenuItem;
const getActiveMenu = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const menu = await menuService.fetchActiveMenu(tenantId, branchId);
        res.status(200).json({ status: 'success', data: menu });
    }
    catch (error) {
        console.error('[Menu API Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Internal server error' });
    }
};
exports.getActiveMenu = getActiveMenu;
const getCategories = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized session' });
            return;
        }
        const branchId = req.query.branchId ? parseInt(String(req.query.branchId), 10) : undefined;
        const categories = await menuService.fetchCategories(tenantId, branchId);
        res.status(200).json({ status: 'success', data: categories });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch categories' });
    }
};
exports.getCategories = getCategories;
