import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getAdjustmentsOverview,
  getAdjustments,
  postCreateAdjustment,
  patchReviewAdjustment,
} from '../controllers/adjustments.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getAdjustments);
router.get('/metrics', getAdjustmentsOverview);
router.post('/', postCreateAdjustment);
router.patch('/:id/review', patchReviewAdjustment);

export default router;