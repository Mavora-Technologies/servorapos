import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPurchaseOrders,
  getPurchaseOrderDetails,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} from '../controllers/purchase-order.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getPurchaseOrders);
router.post('/', createPurchaseOrder);
router.get('/:id', getPurchaseOrderDetails);
router.patch('/:id/status', updatePurchaseOrderStatus);

export default router;