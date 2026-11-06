"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/table.routes.ts
const express_1 = require("express");
const table_controller_1 = require("../controllers/table.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', table_controller_1.getFloorPlan);
router.post('/areas', table_controller_1.createArea);
router.post('/tables', table_controller_1.createTable);
router.patch('/:id/status', table_controller_1.updateStatus);
exports.default = router;
