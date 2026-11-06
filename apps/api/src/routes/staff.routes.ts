import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getStaffRoster,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  resetStaffPin,
} from '../controllers/staff.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getStaffRoster);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.patch('/:id/status', toggleStaffStatus);
router.patch('/:id/pin', resetStaffPin);

export default router;