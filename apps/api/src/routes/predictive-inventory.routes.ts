import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPredictiveInventoryOverview,
  postConvertToPO,
  postDismissRecommendation,
} from '../controllers/predictive-inventory.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPredictiveInventoryOverview);
router.post('/convert-po', postConvertToPO);
router.post('/dismiss', postDismissRecommendation);

export default router;