// apps/api/src/routes/inventory-item.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getInventoryItemsMaster,
  createInventoryItemMaster,
  updateInventoryItemMaster,
  deleteInventoryItemMaster,
} from '../controllers/inventory-item.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getInventoryItemsMaster);
router.post('/', createInventoryItemMaster);
router.put('/:id', updateInventoryItemMaster);
router.delete('/:id', deleteInventoryItemMaster);

export default router;