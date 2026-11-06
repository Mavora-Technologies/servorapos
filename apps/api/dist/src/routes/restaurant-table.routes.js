"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const restaurant_table_controller_1 = require("../controllers/restaurant-table.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', restaurant_table_controller_1.getRestaurantTables);
exports.default = router;
