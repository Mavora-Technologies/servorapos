// apps/api/src/routes/commission.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import * as ctrl from '../controllers/commission.controller';

const router = Router();
router.use(requireAuth);

router.get('/plans', requirePermission(['staff.manage', 'reports.view']), ctrl.getPlans);
router.post('/plans', requirePermission('staff.manage'), ctrl.postPlan);
router.put('/plans/:id', requirePermission('staff.manage'), ctrl.putPlan);

router.get('/preview', requirePermission(['staff.manage', 'reports.view']), ctrl.getPreview);
router.get('/runs', requirePermission(['staff.manage', 'reports.view', 'payments.view']), ctrl.getRuns);
router.post('/runs', requirePermission('staff.manage'), ctrl.postGenerateRun);
router.post('/runs/:id/approve', requirePermission(['staff.manage', 'payments.reconcile']), ctrl.postApproveRun);
router.post('/runs/:id/settle', requirePermission('payments.reconcile'), ctrl.postSettleRun);

export default router;