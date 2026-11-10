import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getMenuAnalysis,
  postApplyPriceRecommendation,
} from '../controllers/menu-analysis.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getMenuAnalysis);
router.post('/apply-price', postApplyPriceRecommendation);

export default router;