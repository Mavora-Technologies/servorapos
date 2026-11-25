// apps/api/src/routes/attendance.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getAttendanceList,
  getLiveDuty,
  handleClockIn,
  handleClockOut,
  handleManualAdjustment,
  handleBatchApprove,
  handleBatchReject,
} from '../controllers/attendance.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['staff.view', 'staff.manage']), getAttendanceList);
router.get('/live-duty', requirePermission(['staff.view', 'staff.manage']), getLiveDuty);
router.post('/clock-in', requirePermission(['staff.view', 'staff.manage', 'pos.access']), handleClockIn);
router.post('/clock-out', requirePermission(['staff.view', 'staff.manage', 'pos.access']), handleClockOut);
router.post('/adjust', requirePermission('staff.manage'), handleManualAdjustment);
router.post('/approve', requirePermission('staff.manage'), handleBatchApprove);
router.post('/reject', requirePermission('staff.manage'), handleBatchReject);

export default router;