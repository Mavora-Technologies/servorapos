"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/combo.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const combo_controller_1 = require("../controllers/combo.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', combo_controller_1.getCombos);
router.post('/', (0, rbac_middleware_1.requirePermission)('menu.manage'), combo_controller_1.createCombo);
router.put('/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), combo_controller_1.updateCombo);
router.patch('/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), combo_controller_1.updateCombo);
router.delete('/:id', (0, rbac_middleware_1.requirePermission)('menu.manage'), combo_controller_1.deleteCombo);
exports.default = router;
