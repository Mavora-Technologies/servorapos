"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/menu.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const menu_controller_1 = require("../controllers/menu.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// Live POS & Catalog Retrieval
router.get('/active', menu_controller_1.getActiveMenu);
router.get('/catalog', menu_controller_1.getMenuCatalog);
// Tenant-Scoped Cloudinary Image Management
router.post('/images/sign', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.signMenuImageUpload);
router.delete('/images', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.deleteMenuImageAsset);
// Menu Categories
router.get('/categories', menu_controller_1.getCategories);
router.post('/categories', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.createCategory);
router.put('/categories/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.updateCategory);
router.patch('/categories/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.updateCategory);
router.delete('/categories/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.deleteCategory);
// Menu Items
router.get('/items', menu_controller_1.getMenuCatalog);
router.post('/items', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.createMenuItem);
router.put('/items/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.updateMenuItem);
router.delete('/items/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), menu_controller_1.deleteMenuItem);
exports.default = router;
