"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/recipe.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const recipe_controller_1 = require("../controllers/recipe.controller");
const recipe_costing_controller_1 = require("../controllers/recipe-costing.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', recipe_controller_1.getRecipesOverview);
router.post('/', recipe_controller_1.saveRecipe);
router.get('/costing', recipe_costing_controller_1.getRecipeCostingAnalytics);
exports.default = router;
