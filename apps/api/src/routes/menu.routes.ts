import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createCategory,
  createMenuItem,
  getActiveMenu,
  getCategories,
} from '../controllers/menu.controller';

const router = Router();
router.use(requireAuth);

router.get('/active', getActiveMenu);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.post('/items', createMenuItem);

export default router;