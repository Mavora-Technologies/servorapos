import { Router } from 'express';
import { getReservations, createReservation, updateStatus } from '../controllers/reservation.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getReservations);
router.post('/', createReservation);
router.patch('/:id/status', updateStatus);

export default router;