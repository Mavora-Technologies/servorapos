import { Router } from 'express';
import { getLocationsTopology, createWarehouseZone, createWarehouseBin } from '../controllers/inventory-locations.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getLocationsTopology);
router.post('/zones', createWarehouseZone);
router.post('/bins', createWarehouseBin);

export default router;