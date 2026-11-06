"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// apps/api/src/routes/stock-transfer.routes.ts
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const stock_transfer_controller_1 = require("../controllers/stock-transfer.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
router.get('/', stock_transfer_controller_1.getStockTransfers);
router.post('/', stock_transfer_controller_1.createStockTransfer);
// ⚠️ MUST be declared BEFORE '/:id' so Express does not capture "fleet" as an ID
router.get('/fleet', stock_transfer_controller_1.getLogisticsFleetList);
router.get('/:id', stock_transfer_controller_1.getStockTransferDetails);
router.post('/:id/dispatch', stock_transfer_controller_1.dispatchStockTransfer);
router.post('/:id/receive', stock_transfer_controller_1.receiveStockTransfer);
exports.default = router;
