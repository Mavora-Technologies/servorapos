"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/analytics.routes.ts
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/dashboard', (0, rbac_middleware_1.requirePermission)(['reports.view', 'settings.view']), analytics_controller_1.getDashboardAnalytics);
exports.default = router;
