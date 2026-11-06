"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/order.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const order_controller_1 = require("../controllers/order.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth); // Protect all order routes
router.post('/', order_controller_1.createOrder);
router.get('/', order_controller_1.getOrders);
router.get('/open', order_controller_1.getOpenOrders);
router.get('/takeaway', order_controller_1.getTakeawayOrders);
router.patch('/:id/status', order_controller_1.updateStatus);
exports.default = router;
