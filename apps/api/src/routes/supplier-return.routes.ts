import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSupplierReturns,
  getSupplierReturnDetails,
  createSupplierReturn,
  updateSupplierReturnStatus,
} from '../controllers/supplier-return.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getSupplierReturns);
router.post('/', createSupplierReturn);
router.get('/:id', getSupplierReturnDetails);
router.patch('/:id/status', updateSupplierReturnStatus);

export default router;