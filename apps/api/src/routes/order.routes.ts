// apps/api/src/routes/order.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createOrder, getOrders, getOpenOrders, updateStatus, getTakeawayOrders } from '../controllers/order.controller';

const router = Router();

router.use(requireAuth); // Protect all order routes

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/open', getOpenOrders);
router.get('/takeaway', getTakeawayOrders);
router.patch('/:id/status', updateStatus);

export default router;