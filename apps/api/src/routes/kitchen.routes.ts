import { Router } from 'express';
import {
  getStationsMeta,
  getStationWorkload,
  getTickets,
  updateStatus,
  updateItemStatus,
  postBumpStationItems,
  getHistory,
  getPerformance,
  getStationsMasterOverview,
  postCreateKitchenStation,
  patchUpdateKitchenStation,
  deleteKitchenStation,
  putKitchenGlobalSettings,
} from '../controllers/kitchen.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// Live KDS Ticket Execution Routes
router.get('/stations-meta', getStationsMeta);
router.get('/stations-workload', getStationWorkload);
router.get('/tickets', getTickets);
router.get('/history', getHistory);
router.get('/performance', getPerformance);
router.patch('/tickets/:id/status', updateStatus);
router.patch('/items/:itemId/status', updateItemStatus);
router.post('/stations/bump', postBumpStationItems);

// Prep Station Master Data, Routing & SLA Configuration Routes
router.get('/stations', getStationsMasterOverview);
router.post('/stations', postCreateKitchenStation);
router.patch('/stations/:id', patchUpdateKitchenStation);
router.delete('/stations/:id', deleteKitchenStation);
router.put('/global-settings', putKitchenGlobalSettings);

export default router;