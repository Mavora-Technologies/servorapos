// apps/api/src/routes/menu.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuCatalog,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getActiveMenu,
  getCategories,
} from '../controllers/menu.controller';

const router = Router();
router.use(requireAuth);

router.get('/active', getActiveMenu);
router.get('/catalog', getMenuCatalog);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/items', getMenuCatalog);
router.post('/items', createMenuItem);
router.put('/items/:id', updateMenuItem);
router.delete('/items/:id', deleteMenuItem);

export default router;