import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getRestaurantTables } from '../controllers/restaurant-table.controller';

const router = Router();
router.use(requireAuth);
router.get('/', getRestaurantTables);

export default router;