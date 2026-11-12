import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createOrder,
  getOrders,
  getOrderDetail,
  getOpenOrders,
  getOnlineOrders,
  updateStatus,
  getTakeawayOrders,
} from '../controllers/order.controller';

const router = Router();
router.use(requireAuth);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/open', getOpenOrders);
router.get('/online', getOnlineOrders);
router.get('/takeaway', getTakeawayOrders);
router.get('/:id', getOrderDetail);
router.patch('/:id/status', updateStatus);

export default router;