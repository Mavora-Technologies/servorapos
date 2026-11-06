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
exports.fetchCategories = exports.fetchActiveMenu = exports.addMenuItem = exports.addCategory = void 0;
// apps/api/src/services/menu.service.ts
const menuRepo = __importStar(require("../repositories/menu.repository"));
const addCategory = async (tenantId, data) => {
    return await menuRepo.createCategory(tenantId, data);
};
exports.addCategory = addCategory;
const addMenuItem = async (tenantId, data) => {
    return await menuRepo.createMenuItem(tenantId, data);
};
exports.addMenuItem = addMenuItem;
const fetchActiveMenu = async (tenantId) => {
    const { categories, items } = await menuRepo.getActiveMenu(tenantId);
    // Format the payload perfectly for the POS frontend interface
    return {
        categories: categories.map(c => c.name),
        items: items.map(i => ({
            id: i.id.toString(),
            name: i.name,
            price: parseFloat(i.price), // Convert decimal string back to number for frontend calculation
            isAvailable: i.isAvailable,
            image: i.imageUrl,
            category: categories.find(c => c.id === i.categoryId)?.name || 'Uncategorized'
        }))
    };
};
exports.fetchActiveMenu = fetchActiveMenu;
const fetchCategories = async (tenantId) => {
    return await menuRepo.getCategories(tenantId);
};
exports.fetchCategories = fetchCategories;
