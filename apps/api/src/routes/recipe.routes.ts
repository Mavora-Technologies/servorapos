// apps/api/src/routes/recipe.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getRecipesOverview, saveRecipe } from '../controllers/recipe.controller';
import { getRecipeCostingAnalytics } from '../controllers/recipe-costing.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getRecipesOverview);
router.post('/', saveRecipe);
router.get('/costing', getRecipeCostingAnalytics);

export default router;