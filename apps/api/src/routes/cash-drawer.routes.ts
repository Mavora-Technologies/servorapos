import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getDrawersDashboard,
  openDrawerSession,
  recordCashDrop,
  closeDrawerSession,
  createCashDrawer,
} from '../controllers/cash-drawer.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['cash.view', 'cash.reconcile']), getDrawersDashboard);
router.post('/', requirePermission(['cash.reconcile', 'settings.manage']), createCashDrawer);
router.post('/sessions/open', requirePermission(['cash.view', 'cash.reconcile']), openDrawerSession);
router.post('/sessions/drop', requirePermission(['cash.view', 'cash.reconcile']), recordCashDrop);
router.post('/sessions/:id/close', requirePermission('cash.reconcile'), closeDrawerSession);

export default router;