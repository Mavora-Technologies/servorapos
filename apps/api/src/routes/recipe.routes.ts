// apps/api/src/routes/recipe.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getRecipesOverview,
  saveRecipe,
  deleteRecipe,
} from '../controllers/recipe.controller';
import { getRecipeCostingAnalytics } from '../controllers/recipe-costing.controller';
import {
  getUnitConversions,
  createUnitConversion,
  updateUnitConversion,
  deleteUnitConversion,
} from '../controllers/unit-conversion.controller';

const router = Router();

router.use(requireAuth);
router.get('/costing', getRecipeCostingAnalytics);

router.get('/units', getUnitConversions);
router.post('/units', createUnitConversion);
router.put('/units/:id', updateUnitConversion);
router.patch('/units/:id', updateUnitConversion);
router.delete('/units/:id', deleteUnitConversion)

router.get('/', getRecipesOverview);
router.post('/', saveRecipe);
router.delete('/:id', deleteRecipe);

export default router;