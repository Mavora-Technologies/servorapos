"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/unit-conversion.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const unit_conversion_controller_1 = require("../controllers/unit-conversion.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', unit_conversion_controller_1.getUnitConversions);
router.post('/', unit_conversion_controller_1.createUnitConversion);
router.delete('/:id', unit_conversion_controller_1.deleteUnitConversion);
exports.default = router;
