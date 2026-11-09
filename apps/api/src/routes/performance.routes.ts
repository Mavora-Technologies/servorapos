import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getReviews,
  getTelemetry,
  postReview,
  putReview,
  postAcknowledge,
} from '../controllers/performance.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getReviews);
router.get('/telemetry', getTelemetry);
router.post('/', postReview);
router.put('/:id', putReview);
router.post('/:id/acknowledge', postAcknowledge);

export default router;