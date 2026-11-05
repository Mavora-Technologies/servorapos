import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getGoodsReceivedNotes,
  getGoodsReceivedDetails,
  processGoodsReceiving,
} from '../controllers/goods-received.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getGoodsReceivedNotes);
router.post('/', processGoodsReceiving);
router.get('/:id', getGoodsReceivedDetails);

export default router;