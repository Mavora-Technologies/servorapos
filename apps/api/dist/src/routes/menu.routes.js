"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/menu.routes.ts
const express_1 = require("express");
const menu_controller_1 = require("../controllers/menu.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All menu routes are protected and tenant-aware[cite: 12]
router.use(auth_middleware_1.requireAuth);
router.post('/categories', menu_controller_1.createCategory);
router.post('/items', menu_controller_1.createMenuItem);
router.get('/active', menu_controller_1.getActiveMenu); // Endpoint used by the POS terminal
router.get('/categories', menu_controller_1.getCategories); // Endpoint to fetch all categories
exports.default = router;
