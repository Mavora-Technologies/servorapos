// apps/api/src/routes/role.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getRolesDirectory,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['staff.roles', 'staff.view']), getRolesDirectory);
router.post('/', requirePermission('staff.roles'), createRole);
router.put('/:id', requirePermission('staff.roles'), updateRole);
router.delete('/:id', requirePermission('staff.roles'), deleteRole);

export default router;