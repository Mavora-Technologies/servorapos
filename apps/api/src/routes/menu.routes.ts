// apps/api/src/routes/menu.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  signMenuImageUpload,
  deleteMenuImageAsset,
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

// Live POS & Catalog Retrieval
router.get('/active', getActiveMenu);
router.get('/catalog', getMenuCatalog);

// Tenant-Scoped Cloudinary Image Management
router.post('/images/sign', requirePermission('menu.manage'), signMenuImageUpload);
router.delete('/images', requirePermission('menu.manage'), deleteMenuImageAsset);

// Menu Categories
router.get('/categories', getCategories);
router.post('/categories', requirePermission('menu.manage'), createCategory);
router.put('/categories/:id', requirePermission('menu.manage'), updateCategory);
router.patch('/categories/:id', requirePermission('menu.manage'), updateCategory);
router.delete('/categories/:id', requirePermission('menu.manage'), deleteCategory);

// Menu Items
router.get('/items', getMenuCatalog);
router.post('/items', requirePermission('menu.manage'), createMenuItem);
router.put('/items/:id', requirePermission('menu.manage'), updateMenuItem);
router.delete('/items/:id', requirePermission('menu.manage'), deleteMenuItem);

export default router;