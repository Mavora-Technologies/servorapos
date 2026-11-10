import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getPromotionsOverview,
  getPromotions,
  postPromotion,
  patchPromotion,
  postValidatePromoCode,
} from '../controllers/promotional-discount.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getPromotions);
router.get('/metrics', getPromotionsOverview);
router.post('/', postPromotion);
router.patch('/:id', patchPromotion);
router.post('/validate', postValidatePromoCode);

export default router;