import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPurchaseRequests,
  getPurchaseRequestDetails,
  createPurchaseRequest,
  reviewPurchaseRequest,
  convertPRToPurchaseOrders,
} from '../controllers/purchase-request.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getPurchaseRequests);
router.post('/', createPurchaseRequest);
router.get('/:id', getPurchaseRequestDetails);
router.patch('/:id/review', reviewPurchaseRequest);
router.post('/:id/convert-to-po', convertPRToPurchaseOrders);

export default router;