import { Router } from 'express';
import { createOrder, getOrders, getOpenOrders, updateStatus, getTakeawayOrders } from '../controllers/order.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/open', getOpenOrders);
router.get('/takeaway', getTakeawayOrders);
router.post('/', createOrder);
router.get('/', getOrders);
router.patch('/:id/status', updateStatus); 

export default router;