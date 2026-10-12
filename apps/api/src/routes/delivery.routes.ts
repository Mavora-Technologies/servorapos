import { Router } from 'express';
import { getDeliveries, assignDriver, markDelivered } from '../controllers/delivery.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getDeliveries);
router.post('/:id/dispatch', assignDriver);
router.patch('/:id/complete', markDelivered);

export default router;