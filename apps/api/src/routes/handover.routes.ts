import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getHandovers,
  getHandoverDetail,
  postHandover,
  putHandover,
  postAcknowledge,
} from '../controllers/handover.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getHandovers);
router.get('/:id', getHandoverDetail);
router.post('/', postHandover);
router.put('/:id', putHandover);
router.post('/:id/acknowledge', postAcknowledge);

export default router;