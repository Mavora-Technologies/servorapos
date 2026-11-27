"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/offline-settings.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const offline_settings_controller_1 = require("../controllers/offline-settings.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', offline_settings_controller_1.getSettings);
router.put('/', offline_settings_controller_1.putSettings);
router.post('/sync', offline_settings_controller_1.postSyncOfflineBatch);
exports.default = router;
