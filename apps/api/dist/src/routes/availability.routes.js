"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/availability.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const availability_controller_1 = require("../controllers/availability.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', availability_controller_1.getAvailabilityOverview);
router.post('/toggle', availability_controller_1.updateItemAvailability);
exports.default = router;
