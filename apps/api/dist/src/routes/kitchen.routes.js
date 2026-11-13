"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kitchen_controller_1 = require("../controllers/kitchen.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth);
// Live KDS Ticket Execution Routes
router.get('/stations-meta', kitchen_controller_1.getStationsMeta);
router.get('/stations-workload', kitchen_controller_1.getStationWorkload);
router.get('/tickets', kitchen_controller_1.getTickets);
router.get('/history', kitchen_controller_1.getHistory);
router.get('/performance', kitchen_controller_1.getPerformance);
router.patch('/tickets/:id/status', kitchen_controller_1.updateStatus);
router.patch('/items/:itemId/status', kitchen_controller_1.updateItemStatus);
router.post('/stations/bump', kitchen_controller_1.postBumpStationItems);
// Prep Station Master Data, Routing & SLA Configuration Routes
router.get('/stations', kitchen_controller_1.getStationsMasterOverview);
router.post('/stations', kitchen_controller_1.postCreateKitchenStation);
router.patch('/stations/:id', kitchen_controller_1.patchUpdateKitchenStation);
router.delete('/stations/:id', kitchen_controller_1.deleteKitchenStation);
router.put('/global-settings', kitchen_controller_1.putKitchenGlobalSettings);
exports.default = router;
