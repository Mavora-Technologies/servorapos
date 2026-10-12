import { Router } from 'express';
import { getWaitlist, createWaitlistEntry, updateStatus } from '../controllers/waitlist.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getWaitlist);
router.post('/', createWaitlistEntry);
router.patch('/:id/status', updateStatus);

export default router;