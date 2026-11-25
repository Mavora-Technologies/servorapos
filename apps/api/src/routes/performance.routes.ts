// apps/api/src/routes/performance.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getReviews,
  getTelemetry,
  postReview,
  putReview,
  postAcknowledge,
  deleteReview,
} from '../controllers/performance.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['reports.view', 'staff.manage', 'staff.view']), getReviews);
router.get('/telemetry', requirePermission(['reports.view', 'staff.manage', 'staff.view']), getTelemetry);
router.post('/', requirePermission(['staff.manage', 'reports.view']), postReview);
router.put('/:id', requirePermission(['staff.manage', 'reports.view']), putReview);
router.delete('/:id', requirePermission(['staff.manage', 'reports.view']), deleteReview);

// Any authenticated employee can acknowledge their own appraisal (ownership enforced in repository)
router.post('/:id/acknowledge', postAcknowledge);

export default router;