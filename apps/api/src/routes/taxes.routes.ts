import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getTaxOverview,
  getFiscalInvoices,
  patchTaxSettings,
  postCreateTaxCode,
  postRetryFiscalization,
} from '../controllers/taxes.controller';

const router = Router();
router.use(requireAuth);

router.get('/overview', getTaxOverview);
router.get('/invoices', getFiscalInvoices);
router.patch('/settings', patchTaxSettings);
router.post('/codes', postCreateTaxCode);
router.post('/retry', postRetryFiscalization);

export default router;