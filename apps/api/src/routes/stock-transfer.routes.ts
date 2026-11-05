// apps/api/src/routes/stock-transfer.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getStockTransfers,
  getStockTransferDetails,
  createStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer,
  getLogisticsFleetList,
} from '../controllers/stock-transfer.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getStockTransfers);
router.post('/', createStockTransfer);

// ⚠️ MUST be declared BEFORE '/:id' so Express does not capture "fleet" as an ID
router.get('/fleet', getLogisticsFleetList);

router.get('/:id', getStockTransferDetails);
router.post('/:id/dispatch', dispatchStockTransfer);
router.post('/:id/receive', receiveStockTransfer);

export default router;