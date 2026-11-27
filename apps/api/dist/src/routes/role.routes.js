"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/role.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const role_controller_1 = require("../controllers/role.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, rbac_middleware_1.requirePermission)(['staff.roles', 'staff.view']), role_controller_1.getRolesDirectory);
router.post('/', (0, rbac_middleware_1.requirePermission)('staff.roles'), role_controller_1.createRole);
router.put('/:id', (0, rbac_middleware_1.requirePermission)('staff.roles'), role_controller_1.updateRole);
router.delete('/:id', (0, rbac_middleware_1.requirePermission)('staff.roles'), role_controller_1.deleteRole);
exports.default = router;
