"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/pricing.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const pricing_controller_1 = require("../controllers/pricing.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', pricing_controller_1.getPricingOverview);
router.put('/bulk', pricing_controller_1.bulkUpdatePrices);
router.post('/rules', pricing_controller_1.createPricingRule);
router.delete('/rules/:id', pricing_controller_1.deletePricingRule);
exports.default = router;
