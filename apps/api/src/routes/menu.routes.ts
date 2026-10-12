import { Router } from 'express';
import { createCategory, createMenuItem, getActiveMenu } from '../controllers/menu.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All menu routes are protected and tenant-aware[cite: 12]
router.use(requireAuth);

router.post('/categories', createCategory);
router.post('/items', createMenuItem);
router.get('/active', getActiveMenu); // Endpoint used by the POS terminal

export default router;