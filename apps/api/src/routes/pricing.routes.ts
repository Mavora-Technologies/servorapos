// apps/api/src/routes/pricing.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPricingOverview,
  bulkUpdatePrices,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
} from '../controllers/pricing.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPricingOverview);
router.put('/bulk', bulkUpdatePrices);
router.post('/rules', createPricingRule);
router.put('/rules/:id', updatePricingRule);
router.patch('/rules/:id', updatePricingRule);
router.delete('/rules/:id', deletePricingRule);

export default router;