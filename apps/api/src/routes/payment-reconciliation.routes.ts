// apps/api/src/routes/payment-reconciliation.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getReconciliationWorkbench,
  matchStatementLineToPayment,
  directReconcilePayment,
  createBankStatement,
  autoMatchConfidentPairs,
  unreconcilePayment,
  clearBankLineAsExpense,
  clearBankLineToInvoice,
} from '../controllers/payment-reconciliation.controller';

const router = Router();
router.use(requireAuth);

router.get('/workbench', getReconciliationWorkbench);
router.post('/match', matchStatementLineToPayment);
router.post('/auto-match', autoMatchConfidentPairs);
router.post('/statement', createBankStatement);
router.post('/unreconcile/:id', unreconcilePayment);
router.post('/clear-expense', clearBankLineAsExpense);
router.post('/clear-invoice', clearBankLineToInvoice);

export default router;