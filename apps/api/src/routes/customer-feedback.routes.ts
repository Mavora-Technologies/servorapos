import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getFeedbackOverview,
  getFeedbacks,
  postFeedback,
  patchFeedbackStatus,
} from '../controllers/customer-feedback.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getFeedbacks);
router.get('/metrics', getFeedbackOverview);
router.post('/', postFeedback);
router.patch('/:id/status', patchFeedbackStatus);

export default router;