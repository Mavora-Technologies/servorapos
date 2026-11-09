import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPaymentIntegrations,
  postPaymentIntegration,
  putPaymentIntegration,
  deletePaymentIntegration,
  postTestHandshake,
} from '../controllers/payment-integration.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPaymentIntegrations);
router.post('/', postPaymentIntegration);
router.put('/:id', putPaymentIntegration);
router.delete('/:id', deletePaymentIntegration);
router.post('/test-handshake', postTestHandshake);

export default router;