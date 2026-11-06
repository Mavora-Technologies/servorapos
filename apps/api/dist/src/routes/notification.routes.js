"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/notification.routes.ts
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', notification_controller_1.getNotifications);
router.patch('/read-all', notification_controller_1.patchReadAll);
router.patch('/:id/read', notification_controller_1.patchNotificationRead);
exports.default = router;
