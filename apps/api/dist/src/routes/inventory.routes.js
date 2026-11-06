"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/inventory.routes.ts
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', inventory_controller_1.getInventory);
router.post('/', inventory_controller_1.createInventoryItem);
router.post('/adjust', inventory_controller_1.adjustStock);
exports.default = router;
