// apps/api/src/routes/staff.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getStaffRoster,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  resetStaffPin,
} from '../controllers/staff.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['staff.view', 'staff.manage']), getStaffRoster);
router.post('/', requirePermission('staff.manage'), createStaff);
router.put('/:id', requirePermission('staff.manage'), updateStaff);
router.patch('/:id/status', requirePermission('staff.manage'), toggleStaffStatus);
router.patch('/:id/pin', requirePermission('staff.manage'), resetStaffPin);

export default router;