import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getMarketingHubOverview } from '../controllers/marketing-hub.controller';

const router = Router();
router.use(requireAuth);

router.get('/overview', getMarketingHubOverview);

export default router;