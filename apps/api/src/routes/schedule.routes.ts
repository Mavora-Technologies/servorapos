import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
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

router.get('/', getRoster);
router.post('/shifts', createShift);
router.put('/shifts/:id', updateShift);
router.delete('/shifts/:id', deleteShift);
router.post('/publish-week', publishWeekRoster);
router.post('/copy-week', copyWeekRoster);
router.post('/templates', createPreset);

export default router;