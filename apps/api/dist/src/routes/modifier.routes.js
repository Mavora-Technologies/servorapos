"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/modifier.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const modifier_controller_1 = require("../controllers/modifier.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', modifier_controller_1.getModifiers);
router.post('/', modifier_controller_1.createModifierGroup);
router.delete('/:id', modifier_controller_1.deleteModifierGroup);
exports.default = router;
