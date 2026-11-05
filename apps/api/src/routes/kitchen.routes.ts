import { Router } from 'express';
import { getTickets, updateStatus, getHistory, getPerformance } from '../controllers/kitchen.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/tickets', getTickets);
router.get('/history', getHistory);
router.patch('/tickets/:id/status', updateStatus);
router.get('/performance', getPerformance);

export default router;