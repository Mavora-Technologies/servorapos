import { Router } from 'express';
import {
  getDeliveries,
  getFleetRoster,
  assignDriver,
  markDelivered,
} from '../controllers/delivery.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getDeliveries);
router.get('/fleet-roster', getFleetRoster);
router.post('/:id/dispatch', assignDriver);
router.patch('/:id/complete', markDelivered);

export default router;