import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getStockCounts,
  getStockCountDetails,
  initiateStockCount,
  updateStockCountLine,
  reconcileStockCount,
} from '../controllers/stock-count.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getStockCounts);
router.post('/initiate', initiateStockCount);
router.get('/:id', getStockCountDetails);
router.put('/items/:itemId', updateStockCountLine);
router.post('/:id/reconcile', reconcileStockCount);

export default router;