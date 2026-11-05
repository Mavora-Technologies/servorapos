import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getRefunds, createRefund } from '../controllers/refund.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getRefunds);
router.post('/', createRefund);

export default router;