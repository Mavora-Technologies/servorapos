// apps/api/src/routes/mpesa.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getMpesaTransactions,
  initiateStkPush,
  initiateB2BPayment,
  reverseMpesaTransaction,
  queryMpesaStatus,
  cancelPendingMpesa,
  getActiveOrdersForMpesa,
} from '../controllers/mpesa.controller';

const router = Router();

router.use(requireAuth);

router.get('/transactions', getMpesaTransactions);
router.get('/active-orders', getActiveOrdersForMpesa); // Sits under /api/v1/payments/mpesa/active-orders
router.post('/stk-push', initiateStkPush);
router.post('/b2b', initiateB2BPayment);
router.get('/transactions/:id/query', queryMpesaStatus);
router.post('/transactions/:id/cancel', cancelPendingMpesa);
router.post('/transactions/:id/reverse', reverseMpesaTransaction);

export default router;