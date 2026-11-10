import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPayablesOverview,
  getPayablesList,
  postCreateBill,
  postDisbursement,
} from '../controllers/payables.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPayablesList);
router.get('/metrics', getPayablesOverview);
router.post('/bills', postCreateBill);
router.post('/disburse', postDisbursement);

export default router;