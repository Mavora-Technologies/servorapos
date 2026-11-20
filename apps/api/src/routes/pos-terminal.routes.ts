// apps/api/src/routes/pos-terminal.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPosContext,
  searchPosCustomers,
  postValidatePromo,
  postValidateStock,
} from '../controllers/pos-terminal.controller';

const router = Router();
router.use(requireAuth);

router.get('/context', getPosContext);
router.get('/customers', searchPosCustomers);
router.post('/validate-promo', postValidatePromo);
router.post('/validate-stock', postValidateStock);

export default router;