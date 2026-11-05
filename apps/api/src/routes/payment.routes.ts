// apps/api/src/routes/payment.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPayments,
  createPayment,
  reversePayment,
} from '../controllers/payment.controller';
import { directReconcilePayment } from '../controllers/payment-reconciliation.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getPayments);
router.post('/', createPayment);
router.post('/:id/reverse', reversePayment);
router.patch('/:id/reconcile', directReconcilePayment);

export default router;