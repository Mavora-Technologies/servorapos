import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTaxOverview,
  getFiscalInvoices,
  patchTaxSettings,
  postRetryFiscalization,
} from '../controllers/taxes.controller';

const router = Router();
router.use(requireAuth);

router.get('/overview', getTaxOverview);
router.get('/invoices', getFiscalInvoices);
router.patch('/settings', patchTaxSettings);
router.post('/retry', postRetryFiscalization);

export default router;