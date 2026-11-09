import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getAssignments,
  getContext,
  postAssignment,
  putAssignment,
  postRevoke,
} from '../controllers/cashier-assignment.controller';

const router = Router();
router.use(requireAuth);

router.get('/', getAssignments);
router.get('/context', getContext);
router.post('/', postAssignment);
router.put('/:id', putAssignment);
router.post('/:id/revoke', postRevoke);

export default router;