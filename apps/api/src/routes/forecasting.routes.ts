import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getForecastOverview, patchForecastModifier } from '../controllers/forecasting.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getForecastOverview);
router.patch('/modifier', patchForecastModifier);

export default router;