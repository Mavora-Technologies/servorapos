import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getBillingDetails,
  putSubscription,
  getInvoices,
  postPaymentMethod,
  deletePaymentMethod,
  postSetDefaultPaymentMethod,
  postSettleInvoice,
} from '../controllers/billing.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getBillingDetails);
router.put('/subscription', putSubscription);
router.get('/invoices', getInvoices);
router.post('/payment-methods', postPaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);
router.post('/payment-methods/:id/set-default', postSetDefaultPaymentMethod);
router.post('/invoices/settle', postSettleInvoice);

export default router;