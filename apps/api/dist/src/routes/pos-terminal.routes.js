"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/pos-terminal.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const pos_terminal_controller_1 = require("../controllers/pos-terminal.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/context', pos_terminal_controller_1.getPosContext);
router.get('/customers', pos_terminal_controller_1.searchPosCustomers);
router.post('/validate-promo', pos_terminal_controller_1.postValidatePromo);
router.post('/validate-stock', pos_terminal_controller_1.postValidateStock);
// Shared Kiosk PIN Switching & PIN Administration
router.get('/kiosk-operators', pos_terminal_controller_1.getKioskOperators);
router.post('/pin-switch', pos_terminal_controller_1.postPosPinSwitch);
router.put('/staff/:userId/pin', (0, rbac_middleware_1.requirePermission)('staff.manage'), pos_terminal_controller_1.putStaffPosPin);
exports.default = router;
