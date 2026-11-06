"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/payment.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const payment_reconciliation_controller_1 = require("../controllers/payment-reconciliation.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', payment_controller_1.getPayments);
router.post('/', payment_controller_1.createPayment);
router.post('/:id/reverse', payment_controller_1.reversePayment);
router.patch('/:id/reconcile', payment_reconciliation_controller_1.directReconcilePayment);
exports.default = router;
