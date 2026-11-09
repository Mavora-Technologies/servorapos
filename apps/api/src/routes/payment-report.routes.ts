import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getPaymentReport, exportPaymentReport } from '../controllers/payment-report.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPaymentReport);
router.get('/export', exportPaymentReport);

export default router;