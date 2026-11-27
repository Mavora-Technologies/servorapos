import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getShiftSetup,
  getShiftOverview,
  getShifts,
  getMyActiveShift,
  postOpenShift,
  postShiftCashMovement,
  postCloseShift,
} from '../controllers/cash-shifts.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['cash.view', 'cash.reconcile']), getShifts);
router.get('/setup', requirePermission(['cash.view', 'cash.reconcile']), getShiftSetup);
router.get('/metrics', requirePermission(['cash.view', 'cash.reconcile']), getShiftOverview);
router.get('/active', requirePermission(['pos.access', 'pos.kiosk', 'cash.view', 'cash.reconcile']), getMyActiveShift);
router.post('/open', requirePermission(['cash.view', 'cash.reconcile']), postOpenShift);
router.post('/cash-movement', requirePermission(['cash.view', 'cash.reconcile']), postShiftCashMovement);
router.post('/close', requirePermission('cash.reconcile'), postCloseShift);

export default router;