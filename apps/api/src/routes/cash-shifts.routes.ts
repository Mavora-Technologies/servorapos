import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getShiftOverview,
  getShifts,
  getMyActiveShift,
  postOpenShift,
  postCloseShift,
} from '../controllers/cash-shifts.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getShifts);
router.get('/metrics', getShiftOverview);
router.get('/active', getMyActiveShift);
router.post('/open', postOpenShift);
router.post('/close', postCloseShift);

export default router;