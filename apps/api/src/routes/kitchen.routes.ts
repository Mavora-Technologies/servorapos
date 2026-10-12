import { Router } from 'express';
import { getTickets, updateStatus } from '../controllers/kitchen.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/tickets', getTickets);
router.patch('/tickets/:id/status', updateStatus);

export default router;