import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getBranches,
  createBranch,
  updateBranch,
  toggleBranchStatus,
} from '../controllers/branch.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getBranches);
router.post('/', createBranch);
router.put('/:id', updateBranch);
router.patch('/:id/toggle-status', toggleBranchStatus);

export default router;