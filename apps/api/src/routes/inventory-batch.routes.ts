import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getInventoryBatches,
  createInventoryBatch,
  updateBatchQCStatus,
  discardInventoryBatch,
} from '../controllers/inventory-batch.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getInventoryBatches);
router.post('/', createInventoryBatch);
router.patch('/:id/qc-status', updateBatchQCStatus);
router.post('/:id/discard', discardInventoryBatch);

export default router;