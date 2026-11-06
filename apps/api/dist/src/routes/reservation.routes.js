"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/reservation.routes.ts
const express_1 = require("express");
const reservation_controller_1 = require("../controllers/reservation.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', reservation_controller_1.getReservations);
router.post('/', reservation_controller_1.createReservation);
router.patch('/:id/status', reservation_controller_1.updateStatus);
exports.default = router;
