import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPosContext,
  searchPosCustomers,
  postValidatePromo,
} from '../controllers/pos-terminal.controller';

const router = Router();
router.use(requireAuth);

router.get('/context', getPosContext);
router.get('/customers', searchPosCustomers);
router.post('/validate-promo', postValidatePromo);

export default router;