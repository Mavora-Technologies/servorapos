import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getWarehouseLocations,
  createWarehouseLocation,
} from '../controllers/warehouse-location.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getWarehouseLocations);
router.post('/', createWarehouseLocation);

export default router;