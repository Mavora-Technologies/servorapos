import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getLogisticsFleet } from '../controllers/logistics-fleet.controller';

const router = Router();
router.use(requireAuth);
router.get('/', getLogisticsFleet);

export default router;