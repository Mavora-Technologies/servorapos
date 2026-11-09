import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getCustomers,
  postCustomer,
  patchCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getCustomers);
router.post('/', postCustomer);
router.patch('/:id', patchCustomer);
router.delete('/:id', deleteCustomer);

export default router;