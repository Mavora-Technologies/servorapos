import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getCategories,
  getOverviewMetrics,
  getExpenses,
  postCreateExpense,
  patchExpenseStatus,
} from '../controllers/expenses.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getExpenses);
router.get('/metrics', getOverviewMetrics);
router.get('/categories', getCategories);
router.post('/', postCreateExpense);
router.patch('/:id/status', patchExpenseStatus);

export default router;