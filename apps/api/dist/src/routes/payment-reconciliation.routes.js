"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/payment-reconciliation.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payment_reconciliation_controller_1 = require("../controllers/payment-reconciliation.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/workbench', payment_reconciliation_controller_1.getReconciliationWorkbench);
router.post('/match', payment_reconciliation_controller_1.matchStatementLineToPayment);
router.post('/auto-match', payment_reconciliation_controller_1.autoMatchConfidentPairs);
router.post('/statement', payment_reconciliation_controller_1.createBankStatement);
router.post('/unreconcile/:id', payment_reconciliation_controller_1.unreconcilePayment);
router.post('/clear-expense', payment_reconciliation_controller_1.clearBankLineAsExpense);
router.post('/clear-invoice', payment_reconciliation_controller_1.clearBankLineToInvoice);
exports.default = router;
