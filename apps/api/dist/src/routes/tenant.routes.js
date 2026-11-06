"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("../controllers/tenant.controller");
const router = (0, express_1.Router)();
router.post('/onboard', tenant_controller_1.onboardTenant);
exports.default = router;
