import { Router } from 'express';
import { getInventory, createInventoryItem, adjustStock } from '../controllers/inventory.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getInventory);
router.post('/', createInventoryItem);
router.post('/adjust', adjustStock);

export default router;