"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/schedule.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const schedule_controller_1 = require("../controllers/schedule.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, rbac_middleware_1.requirePermission)(['staff.view', 'staff.manage']), schedule_controller_1.getRoster);
router.post('/shifts', (0, rbac_middleware_1.requirePermission)('staff.manage'), schedule_controller_1.createShift);
router.put('/shifts/:id', (0, rbac_middleware_1.requirePermission)('staff.manage'), schedule_controller_1.updateShift);
router.delete('/shifts/:id', (0, rbac_middleware_1.requirePermission)('staff.manage'), schedule_controller_1.deleteShift);
router.post('/publish-week', (0, rbac_middleware_1.requirePermission)('staff.manage'), schedule_controller_1.publishWeekRoster);
router.post('/copy-week', (0, rbac_middleware_1.requirePermission)('staff.manage'), schedule_controller_1.copyWeekRoster);
router.post('/templates', (0, rbac_middleware_1.requirePermission)('staff.manage'), schedule_controller_1.createPreset);
exports.default = router;
