import { Router } from 'express';
import { getFloorPlan, createArea, createTable, updateStatus } from '../controllers/table.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', getFloorPlan);
router.post('/areas', createArea);
router.post('/items', createTable);
router.patch('/:id/status', updateStatus);

export default router;