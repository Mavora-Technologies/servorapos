import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
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

router.get('/', getShifts);
router.get('/setup', getShiftSetup);
router.get('/metrics', getShiftOverview);
router.get('/active', getMyActiveShift);
router.post('/open', postOpenShift);
router.post('/cash-movement', postShiftCashMovement);
router.post('/close', postCloseShift);

export default router;