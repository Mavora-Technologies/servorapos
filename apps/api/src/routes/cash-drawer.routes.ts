import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getDrawersDashboard,
  openDrawerSession,
  recordCashDrop,
  closeDrawerSession,
  createCashDrawer,
} from '../controllers/cash-drawer.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getDrawersDashboard);
router.post('/', createCashDrawer);
router.post('/sessions/open', openDrawerSession);
router.post('/sessions/drop', recordCashDrop);
router.post('/sessions/:id/close', closeDrawerSession);

export default router;