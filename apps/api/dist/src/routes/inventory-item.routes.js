"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/inventory-item.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const inventory_item_controller_1 = require("../controllers/inventory-item.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', inventory_item_controller_1.getInventoryItemsMaster);
router.post('/', inventory_item_controller_1.createInventoryItemMaster);
router.put('/:id', inventory_item_controller_1.updateInventoryItemMaster);
router.delete('/:id', inventory_item_controller_1.deleteInventoryItemMaster);
exports.default = router;
