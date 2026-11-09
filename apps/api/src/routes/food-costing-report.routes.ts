import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getFoodCostingReport,
  exportFoodCostingReport,
} from '../controllers/food-costing-report.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getFoodCostingReport);
router.get('/export', exportFoodCostingReport);

export default router;