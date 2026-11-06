"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/mpesa.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const mpesa_controller_1 = require("../controllers/mpesa.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/transactions', mpesa_controller_1.getMpesaTransactions);
router.get('/active-orders', mpesa_controller_1.getActiveOrdersForMpesa); // Sits under /api/v1/payments/mpesa/active-orders
router.post('/stk-push', mpesa_controller_1.initiateStkPush);
router.post('/b2b', mpesa_controller_1.initiateB2BPayment);
router.get('/transactions/:id/query', mpesa_controller_1.queryMpesaStatus);
router.post('/transactions/:id/cancel', mpesa_controller_1.cancelPendingMpesa);
router.post('/transactions/:id/reverse', mpesa_controller_1.reverseMpesaTransaction);
exports.default = router;
