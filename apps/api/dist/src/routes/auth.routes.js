"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/auth.routes.ts
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Ensure both 'login' and 'getMe' are valid functions
router.post('/login', auth_controller_1.login);
router.get('/me', auth_middleware_1.requireAuth, auth_controller_1.getMe);
exports.default = router;
