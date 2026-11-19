// apps/api/src/routes/inventory.routes.ts
import { Router } from 'express';
import {
  getInventory,
  getStorageLocations,
  createInventoryItem,
  adjustStock,
} from '../controllers/inventory.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getInventory);
router.post('/', createInventoryItem);

router.get('/items', getInventory);
router.post('/items', createInventoryItem);

router.get('/locations', getStorageLocations);

router.post('/adjust', adjustStock);
router.post('/movements', adjustStock);

export default router;