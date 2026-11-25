// apps/api/src/routes/branch.routes.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import {
  getBranches,
  createBranch,
  updateBranch,
  toggleBranchStatus,
} from '../controllers/branch.controller';

const router = Router();
router.use(requireAuth);

// Scoped strictly to user_branch_memberships / defaultBranchId in branch.service.ts
router.get('/', getBranches);

router.post('/', requirePermission('settings.manage'), createBranch);
router.put('/:id', requirePermission('settings.manage'), updateBranch);
router.patch('/:id/toggle-status', requirePermission('settings.manage'), toggleBranchStatus);

export default router;