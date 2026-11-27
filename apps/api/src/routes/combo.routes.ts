// apps/api/src/routes/combo.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getCombos,
  createCombo,
  updateCombo,
  deleteCombo,
} from '../controllers/combo.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getCombos);
router.post('/', requirePermission('menu.manage'), createCombo);
router.put('/:id', requirePermission('menu.manage'), updateCombo);
router.patch('/:id', requirePermission('menu.manage'), updateCombo);
router.delete('/:id', requirePermission('menu.manage'), deleteCombo);

export default router;