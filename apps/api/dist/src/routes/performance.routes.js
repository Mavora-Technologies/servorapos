"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/performance.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const performance_controller_1 = require("../controllers/performance.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, rbac_middleware_1.requirePermission)(['reports.view', 'staff.manage', 'staff.view']), performance_controller_1.getReviews);
router.get('/telemetry', (0, rbac_middleware_1.requirePermission)(['reports.view', 'staff.manage', 'staff.view']), performance_controller_1.getTelemetry);
router.post('/', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'reports.view']), performance_controller_1.postReview);
router.put('/:id', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'reports.view']), performance_controller_1.putReview);
router.delete('/:id', (0, rbac_middleware_1.requirePermission)(['staff.manage', 'reports.view']), performance_controller_1.deleteReview);
// Any authenticated employee can acknowledge their own appraisal (ownership enforced in repository)
router.post('/:id/acknowledge', performance_controller_1.postAcknowledge);
exports.default = router;
