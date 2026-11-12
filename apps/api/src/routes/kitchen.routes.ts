import { Router } from 'express';
import {
  getStationsMeta,
  getTickets,
  updateStatus,
  updateItemStatus,
  getHistory,
  getPerformance,
} from '../controllers/kitchen.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/stations-meta', getStationsMeta);
router.get('/tickets', getTickets);
router.get('/history', getHistory);
router.get('/performance', getPerformance);
router.patch('/tickets/:id/status', updateStatus);
router.patch('/items/:itemId/status', updateItemStatus);

export default router;