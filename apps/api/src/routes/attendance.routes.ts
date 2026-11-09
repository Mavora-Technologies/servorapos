import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getAttendanceList,
  getLiveDuty,
  handleClockIn,
  handleClockOut,
  handleManualAdjustment,
  handleBatchApprove,
} from '../controllers/attendance.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getAttendanceList);
router.get('/live-duty', getLiveDuty);
router.post('/clock-in', handleClockIn);
router.post('/clock-out', handleClockOut);
router.post('/adjust', handleManualAdjustment);
router.post('/approve', handleBatchApprove);

export default router;