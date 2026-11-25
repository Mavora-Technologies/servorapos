// apps/api/src/routes/cashier-assignment.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getAssignments,
  getContext,
  postAssignment,
  putAssignment,
  postRevoke,
} from '../controllers/cashier-assignment.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['staff.manage', 'cash.reconcile', 'cash.view']), getAssignments);
router.get('/context', requirePermission(['staff.manage', 'cash.reconcile', 'cash.view']), getContext);
router.post('/', requirePermission(['staff.manage', 'cash.reconcile']), postAssignment);
router.put('/:id', requirePermission(['staff.manage', 'cash.reconcile']), putAssignment);
router.post('/:id/revoke', requirePermission(['staff.manage', 'cash.reconcile']), postRevoke);

export default router;