"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const finance_hub_controller_1 = require("../controllers/finance-hub.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/overview', finance_hub_controller_1.getFinanceOverview);
exports.default = router;
