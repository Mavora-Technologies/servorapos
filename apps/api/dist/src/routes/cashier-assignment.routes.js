"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/cashier-assignment.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const cashier_assignment_controller_1 = require("../controllers/cashier-assignment.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'cash.reconcile', 'cash.view']), cashier_assignment_controller_1.getAssignments);
router.get('/context', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'cash.reconcile', 'cash.view']), cashier_assignment_controller_1.getContext);
router.post('/', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'cash.reconcile']), cashier_assignment_controller_1.postAssignment);
router.put('/:id', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'cash.reconcile']), cashier_assignment_controller_1.putAssignment);
router.post('/:id/revoke', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'cash.reconcile']), cashier_assignment_controller_1.postRevoke);
exports.default = router;
