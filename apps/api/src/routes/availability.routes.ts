// apps/api/src/routes/availability.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getAvailabilityOverview,
  updateItemAvailability,
} from '../controllers/availability.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getAvailabilityOverview);
router.post('/toggle', updateItemAvailability);

export default router;