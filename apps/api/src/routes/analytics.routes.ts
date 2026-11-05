// apps/api/src/routes/analytics.routes.ts
import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', getDashboardAnalytics);

export default router;