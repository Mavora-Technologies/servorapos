import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
} from '../controllers/supplier.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.patch('/:id/toggle-status', toggleSupplierStatus);

export default router;