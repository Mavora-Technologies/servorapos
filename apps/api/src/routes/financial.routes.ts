import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getSettings,
  putSettings,
  postTaxCode,
  deleteTaxCode,
  testEtimsHandshake,
} from '../controllers/financial.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getSettings);
router.put('/', putSettings);
router.post('/tax-codes', postTaxCode);
router.delete('/tax-codes/:id', deleteTaxCode);
router.post('/etims/test-connection', testEtimsHandshake);

export default router;