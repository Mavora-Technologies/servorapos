// apps/api/src/routes/analytics.routes.ts
import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

router.get(
  '/dashboard',
  requirePermission(['reports.view', 'settings.view']),
  getDashboardAnalytics
);

export default router;