"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/combo.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const combo_controller_1 = require("../controllers/combo.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', combo_controller_1.getCombos);
router.post('/', combo_controller_1.createCombo);
router.delete('/:id', combo_controller_1.deleteCombo);
exports.default = router;
