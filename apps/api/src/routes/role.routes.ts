import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getRolesDirectory,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/role.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getRolesDirectory);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;