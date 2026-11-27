"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/staff.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const staff_controller_1 = require("../controllers/staff.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, rbac_middleware_1.requirePermission)(['staff.view', 'staff.manage']), staff_controller_1.getStaffRoster);
router.post('/', (0, rbac_middleware_1.requirePermission)('staff.manage'), staff_controller_1.createStaff);
router.put('/:id', (0, rbac_middleware_1.requirePermission)('staff.manage'), staff_controller_1.updateStaff);
router.patch('/:id/status', (0, rbac_middleware_1.requirePermission)('staff.manage'), staff_controller_1.toggleStaffStatus);
router.patch('/:id/pin', (0, rbac_middleware_1.requirePermission)('staff.manage'), staff_controller_1.resetStaffPin);
exports.default = router;
