import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getFinanceOverview } from '../controllers/finance-hub.controller';

const router = Router();
router.use(requireAuth);

router.get('/overview', getFinanceOverview);

export default router;