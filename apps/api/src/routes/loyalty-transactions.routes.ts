import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getLoyaltyTransactionsReport,
  exportLoyaltyTransactionsReport,
} from '../controllers/loyalty-transactions.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getLoyaltyTransactionsReport);
router.get('/export', exportLoyaltyTransactionsReport);

export default router;