import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSupplierInvoices,
  getSupplierInvoiceDetails,
  createSupplierInvoice,
  recordSupplierPayment,
  generateInvoiceFromGRN,
  getUninvoicedGRNs,
} from '../controllers/supplier-invoice.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getSupplierInvoices);
router.post('/', createSupplierInvoice);
router.get('/:id', getSupplierInvoiceDetails);
router.post('/:id/payments', recordSupplierPayment);
router.get('/uninvoiced-grns', getUninvoicedGRNs);
router.get('/from-grn/:grnId', generateInvoiceFromGRN);

export default router;