"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/attendance.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const attendance_controller_1 = require("../controllers/attendance.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', (0, rbac_middleware_1.requirePermission)(['staff.view', 'staff.manage']), attendance_controller_1.getAttendanceList);
router.get('/live-duty', (0, rbac_middleware_1.requirePermission)(['staff.view', 'staff.manage']), attendance_controller_1.getLiveDuty);
router.post('/clock-in', (0, rbac_middleware_1.requirePermission)(['staff.view', 'staff.manage', 'pos.access']), attendance_controller_1.handleClockIn);
router.post('/clock-out', (0, rbac_middleware_1.requirePermission)(['staff.view', 'staff.manage', 'pos.access']), attendance_controller_1.handleClockOut);
router.post('/adjust', (0, rbac_middleware_1.requirePermission)('staff.manage'), attendance_controller_1.handleManualAdjustment);
router.post('/approve', (0, rbac_middleware_1.requirePermission)('staff.manage'), attendance_controller_1.handleBatchApprove);
router.post('/reject', (0, rbac_middleware_1.requirePermission)('staff.manage'), attendance_controller_1.handleBatchReject);
exports.default = router;
