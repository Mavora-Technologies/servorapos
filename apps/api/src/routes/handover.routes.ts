// apps/api/src/routes/handover.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getHandovers,
  getHandoverContext,
  getHandoverDetail,
  postHandover,
  putHandover,
  postAcknowledge,
  postDispute,
  postResolveDispute,
} from '../controllers/handover.controller';

const router = Router();
router.use(requireAuth);

const HANDOVER_VIEW_PERMS = ['staff.view', 'cash.reconcile', 'staff.manage'];
const HANDOVER_ACTION_PERMS = ['cash.reconcile', 'staff.manage', 'staff.view'];

router.get('/', requirePermission(HANDOVER_VIEW_PERMS), getHandovers);
router.get('/context', requirePermission(HANDOVER_VIEW_PERMS), getHandoverContext);
router.get('/:id', requirePermission(HANDOVER_VIEW_PERMS), getHandoverDetail);
router.post('/', requirePermission(HANDOVER_ACTION_PERMS), postHandover);
router.put('/:id', requirePermission(HANDOVER_ACTION_PERMS), putHandover);
router.post('/:id/acknowledge', requirePermission(HANDOVER_ACTION_PERMS), postAcknowledge);
router.post('/:id/dispute', requirePermission(HANDOVER_ACTION_PERMS), postDispute);
router.post('/:id/resolve', requirePermission(['cash.reconcile', 'staff.manage']), postResolveDispute);

export default router;