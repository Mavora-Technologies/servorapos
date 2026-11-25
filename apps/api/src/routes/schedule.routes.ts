// apps/api/src/routes/schedule.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getRoster,
  createShift,
  updateShift,
  deleteShift,
  publishWeekRoster,
  copyWeekRoster,
  createPreset,
} from '../controllers/schedule.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['staff.view', 'staff.manage']), getRoster);
router.post('/shifts', requirePermission('staff.manage'), createShift);
router.put('/shifts/:id', requirePermission('staff.manage'), updateShift);
router.delete('/shifts/:id', requirePermission('staff.manage'), deleteShift);
router.post('/publish-week', requirePermission('staff.manage'), publishWeekRoster);
router.post('/copy-week', requirePermission('staff.manage'), copyWeekRoster);
router.post('/templates', requirePermission('staff.manage'), createPreset);

export default router;