import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getMenuItems } from '../controllers/menu-item.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getMenuItems);

export default router;