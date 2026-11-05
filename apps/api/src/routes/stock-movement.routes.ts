import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { 
  getStockMovements, 
  createManualMovement, 
  reverseStockMovement 
} from '../controllers/stock-movement.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getStockMovements);
router.post('/', createManualMovement);
router.post('/:id/reverse', reverseStockMovement);

export default router;